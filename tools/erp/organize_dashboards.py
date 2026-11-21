"""Create editable category folders from an existing ERP source snapshot."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import quote


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True)
    parser.add_argument('--layout', default='tools/erp/dashboard_hierarchy.json')
    parser.add_argument('--output', default='.')
    args = parser.parse_args()
    source = Path(args.source)
    output = Path(args.output)
    layout = json.loads(Path(args.layout).read_text(encoding='utf-8'))
    blocks = {}
    for path in (source / 'dashboards').glob('*/source.json'):
        doc = json.loads(path.read_text(encoding='utf-8'))
        if 'backup' not in doc['name'].lower():
            blocks[doc['name']] = doc
    servers = []
    for path in (source / 'server_scripts').glob('*.json'):
        doc = json.loads(path.read_text(encoding='utf-8'))
        if 'backup' not in doc['name'].lower() and doc.get('api_method'):
            servers.append(doc)
    planned = []
    for category, entries in layout.items():
        for label, names in entries.items():
            names = names if isinstance(names, list) else [names]
            for name in names:
                directory = Path(category) / label
                if len(names) > 1:
                    directory /= name
                if name and name not in blocks:
                    raise ValueError('ERP source not found: ' + name)
                if (output / directory).exists():
                    raise ValueError('Folder already exists; preserve local edits: ' + str(directory))
                planned.append((category, label, name, directory))
    manifest = {'source_snapshot': str(source), 'dashboards': [], 'unresolved': [], 'files': []}

    def write(path, value):
        target = output / path
        target.parent.mkdir(parents=True, exist_ok=True)
        data = value.encode('utf-8')
        target.write_bytes(data)
        manifest['files'].append({'path': path.as_posix(), 'sha256': hashlib.sha256(data).hexdigest()})

    def references(method, text):
        return bool(re.search(r'''["'`](?:/api/method/)?''' + re.escape(method) + r'''(?:["'`?])''', text))

    def linked_scripts(doc):
        text = (doc.get('script') or '') + '\n' + (doc.get('html') or '')
        selected = {}
        while True:
            matches = [s for s in servers if s['name'] not in selected and references(s['api_method'], text)]
            if not matches:
                return list(selected.values())
            for script in matches:
                selected[script['name']] = script
                text += '\n' + (script.get('script') or '')

    def link(path):
        return quote(path.as_posix(), safe='/')

    category_lines = {category: ['# ' + category, ''] for category in layout}
    unique_scripts = set()
    for category, label, name, directory in planned:
        category_lines[category].append('- [%s](%s/README.md)%s' % (
            label if name is None or len(layout[category][label] if isinstance(layout[category][label], list) else []) == 0 else name,
            link(directory.relative_to(category)), ' — source not identified' if name is None else ''))
        if name is None:
            write(directory / 'README.md', '# ' + label + '\n\nNo exact matching Custom HTML Block was found in the ERP snapshot. Source files have not been invented.\n')
            manifest['unresolved'].append({'label': label, 'directory': directory.as_posix()})
            continue
        doc = blocks[name]
        scripts = linked_scripts(doc)
        for field, ext in [('script', 'js'), ('style', 'css'), ('html', 'html')]:
            write(directory / ('dashboard.' + ext), doc.get(field) or '')
        write(directory / 'source.json', json.dumps(doc, ensure_ascii=False, indent=2) + '\n')
        lines = ['# ' + label, '', 'ERP Custom HTML Block: `' + name + '`', '',
                 '- [JavaScript](dashboard.js)', '- [CSS](dashboard.css)', '- [HTML](dashboard.html)',
                 '- [Original record](source.json)', '', '## Server scripts', '']
        script_paths = []
        for script in scripts:
            method = script['api_method']
            safe = re.sub(r'[^A-Za-z0-9_.-]', '_', method)
            safe += '_' + hashlib.sha256(script['name'].encode('utf-8')).hexdigest()[:8]
            relative = Path('server_scripts') / (safe + '.py')
            write(directory / relative, script.get('script') or '')
            write(directory / relative.with_suffix('.json'), json.dumps(script, ensure_ascii=False, indent=2) + '\n')
            lines.append('- [%s](%s)' % (script['name'], link(relative)))
            script_paths.append((directory / relative).as_posix())
            unique_scripts.add(script['name'])
        if not scripts:
            lines.append('No custom API Server Script matched literal method references. This block may use standard Frappe APIs; dynamically constructed calls require separate inspection.')
        lines += ['', 'Sources are copied exactly. Server matches include transitive API references. Shared scripts are copied into each dashboard that references them; changes to shared APIs should be kept consistent across these copies.', '']
        write(directory / 'README.md', '\n'.join(lines))
        manifest['dashboards'].append({'name': name, 'directory': directory.as_posix(), 'modified': doc.get('modified'), 'server_scripts': script_paths})
    index = ['# Dashboard directory', '', 'Editable source files grouped by department. Backups are excluded.', '',
             'Each dashboard contains `dashboard.js`, `dashboard.css`, `dashboard.html`, its original ERP record, and matching custom API scripts.', '',
             '| Category | Exported dashboards |', '| --- | --- |']
    for category, lines in category_lines.items():
        write(Path(category) / 'README.md', '\n'.join(lines) + '\n')
        count = sum(1 for row in manifest['dashboards'] if Path(row['directory']).parts[0] == category)
        index.append('| [%s](%s/README.md) | %d |' % (category, link(Path(category)), count))
    index += ['', 'Unresolved names: ' + ', '.join(row['label'] for row in manifest['unresolved']) + '.', '',
              'Quotation & SO Tracker maps to Sales CRM & Conversion Tracker Dashboard, whose source uses that displayed title. Blocked Customer Dashboard contains the six department-specific ERP blocks.', '',
              'Finance Manager, Finance Internal Controller, Digital Marketing, Production, and Plant & Furniture are retained from the earlier requested selection, so some category totals exceed the example counts.', '']
    write(Path('DASHBOARDS.md'), '\n'.join(index))
    (output / 'dashboard_directory_manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('%d dashboards in %d categories; %d unique API scripts; %d unresolved names.' % (len(manifest['dashboards']), len(layout), len(unique_scripts), len(manifest['unresolved'])))


if __name__ == '__main__':
    main()
