"""Read ERP dashboard sources using local credentials; never writes to ERP."""
import argparse
import datetime
import hashlib
import json
import re
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--env', default='config/erpapi.env')
    parser.add_argument('--output', default='.local/erp_exports')
    parser.add_argument('--inspect', action='store_true')
    parser.add_argument('--dashboards', help='JSON array of exact Custom HTML Block names')
    parser.add_argument('--source-export', help='Reuse a previously downloaded source export')
    args = parser.parse_args()
    config = {}
    for line in Path(args.env).read_text(encoding='utf-8-sig').splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            config[key.strip()] = value.strip().strip('\"\'')
    url = config['ERPNEXT_URL'].rstrip('/')
    if urllib.parse.urlsplit(url).scheme != 'https':
        raise SystemExit('ERPNEXT_URL must use HTTPS.')
    token = 'token ' + config['ERPNEXT_API_KEY'] + ':' + config['ERPNEXT_API_SECRET']

    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None

    opener = urllib.request.build_opener(NoRedirect())

    def get(path, params=None):
        endpoint = url + '/api/resource/' + path
        if params:
            endpoint += '?' + urllib.parse.urlencode(params)
        request = urllib.request.Request(endpoint, headers={
            'Authorization': token, 'Accept': 'application/json',
        })
        try:
            with opener.open(request, timeout=90) as response:
                return json.load(response)['data']
        except urllib.error.HTTPError as error:
            raise RuntimeError('ERP read failed: HTTP %s for %s' % (error.code, path)) from None

    def listing(doctype, fields):
        rows = []
        while True:
            page = get(urllib.parse.quote(doctype, safe=''), {
                'fields': json.dumps(fields), 'limit_start': len(rows),
                'limit_page_length': 100, 'order_by': 'name asc',
            })
            rows.extend(page)
            if len(page) < 100:
                return rows

    if args.source_export:
        previous = Path(args.source_export)
        blocks = [json.loads(p.read_text(encoding='utf-8')) for p in (previous / 'dashboards').glob('*/source.json')]
        servers = [json.loads(p.read_text(encoding='utf-8')) for p in (previous / 'server_scripts').glob('*.json')]
    else:
        blocks = listing('Custom HTML Block', ['*'])
        servers = listing('Server Script', ['*'])

    def references(method, source):
        return bool(re.search(r'''["'`](?:/api/method/)?''' + re.escape(method) + r'''["'`]''', source))
    if args.dashboards:
        requested = json.loads(Path(args.dashboards).read_text(encoding='utf-8'))
        available = {row['name']: row for row in blocks}
        missing = [name for name in requested if name not in available]
        if missing:
            raise RuntimeError('Dashboard names not found: ' + ', '.join(missing))
        blocks = [available[name] for name in dict.fromkeys(requested)]
        candidates = [row for row in servers if 'backup' not in row['name'].lower()]
        sources = '\n'.join((row.get('script') or '') + '\n' + (row.get('html') or '') for row in blocks)
        selected = {}
        while True:
            matches = [row for row in candidates if row['name'] not in selected
                       and row.get('api_method') and references(row['api_method'], sources)]
            if not matches:
                break
            for row in matches:
                selected[row['name']] = row
                sources += '\n' + (row.get('script') or '')
        servers = list(selected.values())
    if args.inspect:
        print(json.dumps({'blocks': [{'name': r['name']} for r in blocks],
                          'server_scripts': [{'name': r['name'], 'api_method': r.get('api_method')} for r in servers]},
                         ensure_ascii=True, indent=2))
        return

    root = Path(args.output) / datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    root.mkdir(parents=True, exist_ok=False)
    manifest = {'source': url, 'exported_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                'blocks': [], 'server_scripts': [], 'files': []}
    if args.source_export:
        old_manifest = json.loads((previous / 'manifest.json').read_text(encoding='utf-8'))
        manifest['source_exported_at'] = old_manifest['exported_at']

    def slug(name):
        clean = re.sub(r'[^a-zA-Z0-9_-]+', '_', name).strip('_').lower()[:90] or 'record'
        return clean + '_' + hashlib.sha256(name.encode('utf-8')).hexdigest()[:8]

    def write(relative, content):
        target = root / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        data = content.encode('utf-8')
        target.write_bytes(data)
        manifest['files'].append({'path': relative, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})

    def document(doctype, name):
        return get(urllib.parse.quote(doctype, safe='') + '/' + urllib.parse.quote(name, safe=''))

    for row in blocks:
        doc = row
        base = 'dashboards/' + slug(row['name'])
        write(base + '/source.json', json.dumps(doc, ensure_ascii=False, indent=2) + '\n')
        for field, filename in [('html', 'dashboard.html'), ('script', 'dashboard.js'), ('style', 'dashboard.css')]:
            write(base + '/' + filename, doc.get(field) or '')
        manifest['blocks'].append({'name': row['name'], 'modified': doc.get('modified'), 'directory': base,
                                   'server_scripts': []})
        print('Exported block: ' + row['name'], flush=True)

    # Retain every server script so dynamic method names and scheduled backend jobs are available.
    for row in servers:
        doc = row
        base = 'server_scripts/' + slug(row['name'])
        write(base + '.json', json.dumps(doc, ensure_ascii=False, indent=2) + '\n')
        write(base + '.py', doc.get('script') or '')
        entry = {key: row.get(key) for key in ['name', 'api_method', 'script_type', 'disabled', 'modified']}
        entry['path'] = base + '.py'
        manifest['server_scripts'].append(entry)
        method = doc.get('api_method')
        if method:
            for block in manifest['blocks']:
                source = '\n'.join((root / block['directory'] / filename).read_text(encoding='utf-8') for filename in ['dashboard.js', 'dashboard.html'])
                if references(method, source):
                    block['server_scripts'].append({'name': row['name'], 'api_method': method, 'path': base + '.py'})
        print('Exported server script: ' + row['name'], flush=True)

    lines = ['# ERP source export', '', 'Exact UTF-8 source fields read from ERP. Existing workspace files were preserved.', '',
             'Includes only the requested dashboards and matching API Server Scripts; backups are excluded.' if args.dashboards else 'Includes all Custom HTML Blocks and Server Scripts.',
             'API scripts are matched by method text, recursively including references from matched server scripts. Dynamic method names and non-API hooks may require separate discovery.' if args.dashboards else 'All Server Scripts are included to retain dynamically referenced APIs and scheduled jobs.',
             'Server links below are candidate matches by API method text in the block JavaScript.', '',
             '| Custom HTML Block | Sources | Matching server scripts |', '| --- | --- | --- |']
    for block in manifest['blocks']:
        base = block['directory']
        sources = ' / '.join('[%s](%s/dashboard.%s)' % (ext.upper(), base, ext) for ext in ['js', 'css', 'html'])
        links = ', '.join('[%s](%s)' % (s['name'], s['path']) for s in block['server_scripts']) or 'No literal API method match'
        lines.append('| %s | %s | %s |' % (block['name'].replace('|', '\\|'), sources, links))
    write('README.md', '\n'.join(lines) + '\n')
    # Write the final manifest after all other files have been hashed.
    (root / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Saved %d blocks and %d server scripts to %s' % (len(blocks), len(servers), root))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        raise SystemExit('%s: %s' % (type(error).__name__, error)) from None
