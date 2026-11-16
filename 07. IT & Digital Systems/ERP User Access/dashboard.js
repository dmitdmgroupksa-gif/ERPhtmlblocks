(function(){
  const root = root_element;
  const $ = s => root.querySelector(s);
  const $$ = s => root.querySelectorAll(s);
  const state = { dept: '', data: null, dirFilter: {}, showAllDepts: false, loading: false };
  const COLORS = { Active: '#1E8E5A', Inactive: '#C98A0B', Disabled: '#B4413C' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = n => (typeof n === 'number') ? n.toLocaleString('en-US') : '—';

  // ---------- tabs ----------
  function show(t){
    $$('.uad-tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
    $$('.uad-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === t));
  }
  $$('.uad-tabs button').forEach(b => b.addEventListener('click', () => show(b.dataset.tab)));

  // ---------- User Directory (live, server-side filter/sort/paging) ----------
  const DIR_DEFAULT = { status: 'all', department: '', user_type: '', role: '', search: '', inactivity: '', date_basis: '', sort_by: 'full_name', sort_order: 'asc', page: 1, page_size: 20 };
  state.dir = Object.assign({}, DIR_DEFAULT);
  state.dirRows = []; state.dirSeq = 0; state.dirLoaded = false; state.dirOptsLoaded = false;
  const PRIV_ROLES = ['System Manager', 'IT Coordinator', 'Dashboard Manager'];
  const LABELS = { status: 'Status', department: 'Department', user_type: 'User type', role: 'Role', search: 'Search', inactivity: 'Last login', flag: 'Flag', date_basis: 'Date filter' };
  const INACT = { '15': 'No login in 15+ days', '30': 'No login in 30+ days', '60': 'No login in 60+ days', never: 'Never logged in', b16_30: 'Last login 16–30 days ago', b31_60: 'Last login 31–60 days ago', b61: 'Last login over 60 days ago' };

  function openDirectory(filter){
    state.dir = Object.assign({}, DIR_DEFAULT, { page_size: state.dir.page_size }, filter);
    if (state.dept && !('department' in filter)) state.dir.department = state.dept;
    state.dirLoaded = true;
    show('directory');
    loadDir();
  }
  function syncControls(){
    $$('[data-f]').forEach(el => { const k = el.dataset.f; if (k in state.dir) el.value = String(state.dir[k]); });
    $$('.uad-table th[data-sort]').forEach(th => {
      const on = th.dataset.sort === state.dir.sort_by;
      th.classList.toggle('sorted', on);
      let ar = th.querySelector('.ar'); if (!ar) { ar = document.createElement('span'); ar.className = 'ar'; th.appendChild(ar); }
      ar.textContent = on ? (state.dir.sort_order === 'asc' ? '▲' : '▼') : '↕';
    });
    const chips = [];
    Object.keys(LABELS).forEach(k => {
      const v = state.dir[k]; if (!v || v === 'all') return;
      const shown = k === 'date_basis' ? ((v === 'created' ? 'Created between' : 'Last login between') + ' ' + (state.period ? state.period.from + ' – ' + state.period.to : '')) : k === 'flag' ? ({ multi_priv: 'Multiple privileged roles', conflict: 'Employee mapping conflict' }[v] || v) : k === 'inactivity' ? INACT[v] : (k === 'status' ? v.charAt(0).toUpperCase() + v.slice(1) : v);
      chips.push('<span class="uad-chip">' + esc(LABELS[k] + ': ' + shown) + '</span>');
    });
    $('[data-role="dir-filter"]').innerHTML = chips.join('') || '<span class="uad-muted">No filters applied — showing all users in scope</span>';
  }
  function fillOptions(opts){
    if (state.dirOptsLoaded || !opts) return;
    const add = (sel, list) => list.forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; sel.appendChild(o); });
    add($('[data-f="department"]'), opts.departments || []);
    add($('[data-f="role"]'), opts.roles || []);
    state.dirOptsLoaded = true;
  }
  function dirError(msg){
    const box = $('[data-role="dir-error"]');
    if (!msg) { box.hidden = true; return; }
    box.innerHTML = '<span>' + esc(msg) + '</span><button type="button">Retry</button>';
    box.hidden = false;
    box.querySelector('button').addEventListener('click', loadDir);
  }
  async function loadDir(){
    const seq = ++state.dirSeq;
    syncControls(); dirError(null);
    $('[data-role="dir-body"]').innerHTML = '<tr><td colspan="8" class="full"><div class="uad-skel" style="height:60px"></div></td></tr>';
    $('[data-role="dir-count"]').textContent = 'Loading…';
    const p = {};
    Object.keys(state.dir).forEach(k => { const v = state.dir[k]; if (v !== '' && v != null) p[k] = v; });
    if (state.data && state.data.report_timestamp) p.ref_date = state.data.report_timestamp.slice(0, 10);
    if (p.date_basis && state.period) { p.from_date = state.period.from; p.to_date = state.period.to; } else { delete p.date_basis; }
    try {
      let r = await fetch('/api/method/user_access_directory?' + new URLSearchParams(p), { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
      let j = null; try { j = await r.json(); } catch (e) {}
      if (!r.ok && r.status === 417 && p.ref_date && j && /Reference date/.test(j._server_messages || '')) {
        delete p.ref_date; // date rolled over past yesterday — fall back to server's current date
        r = await fetch('/api/method/user_access_directory?' + new URLSearchParams(p), { credentials: 'same-origin' });
        j = null; try { j = await r.json(); } catch (e) {}
      }
      if (seq !== state.dirSeq) return;
      if (!r.ok || !j || !j.message) {
        let msg = 'Could not load user directory (HTTP ' + r.status + ').';
        try { const m = JSON.parse(JSON.parse(j._server_messages)[0]).message; if (m) msg = m; } catch (e) {}
        if (r.status === 403) msg = 'You are not permitted to view the user directory.';
        throw new Error(msg);
      }
      renderDir(j.message);
    } catch (e) {
      if (seq !== state.dirSeq) return;
      $('[data-role="dir-body"]').innerHTML = '<tr><td colspan="8" class="full"><div class="uad-empty">Directory data unavailable.</div></td></tr>';
      $('[data-role="dir-count"]').textContent = '—';
      $('[data-role="page-info"]').textContent = '—';
      $('[data-page="prev"]').disabled = true; $('[data-page="next"]').disabled = true;
      dirError(e.message || 'Could not load user directory.');
    }
  }
  function roleTags(roles){
    if (!roles.length) return '<span class="uad-muted">No roles</span>';
    const pr = roles.filter(r => PRIV_ROLES.indexOf(r) >= 0), other = roles.filter(r => PRIV_ROLES.indexOf(r) < 0);
    const shown = pr.concat(other).slice(0, 3);
    return '<div class="uad-roles">' + shown.map(r => '<span class="uad-role' + (PRIV_ROLES.indexOf(r) >= 0 ? ' p' : '') + '">' + esc(r) + '</span>').join('') +
      (roles.length > 3 ? '<span class="uad-more">+' + (roles.length - 3) + ' more</span>' : '') + '</div>';
  }
  function renderDir(m){
    state.dirRows = m.rows || [];
    state.dir.page = m.page;
    fillOptions(m.options);
    syncControls();
    $('[data-role="dir-count"]').textContent = fmt(m.total_matching) + ' matching user' + (m.total_matching === 1 ? '' : 's');
    $('[data-role="page-info"]').textContent = m.total_pages ? ('Page ' + m.page + ' of ' + m.total_pages) : 'No pages';
    $('[data-page="prev"]').disabled = m.page <= 1;
    $('[data-page="next"]').disabled = m.page >= m.total_pages;
    if (!state.dirRows.length) {
      $('[data-role="dir-body"]').innerHTML = '<tr><td colspan="8" class="full"><div class="uad-empty">' +
        (m.total_matching ? 'This page is empty — go back to an earlier page.' : 'No users match the selected filters.') + '</div></td></tr>';
      return;
    }
    $('[data-role="dir-body"]').innerHTML = state.dirRows.map((u, i) =>
      '<tr>' +
      '<td data-label="Full Name"><span class="nm">' + esc(u.full_name) + '</span>' + (u.privileged ? ' <span class="uad-badge b-priv" title="Privileged access">★</span>' : '') + '</td>' +
      '<td data-label="User ID / Email" class="em">' + esc(u.email) + (u.email !== u.user ? '<br><small>' + esc(u.user) + '</small>' : '') + '</td>' +
      '<td data-label="Department">' + esc(u.department) + (u.mapping_conflict ? ' <span class="uad-badge b-conf" title="Linked to ' + u.employee_links + ' Employee records">⚠ conflict</span>' : '') + '</td>' +
      '<td data-label="User Type">' + esc(u.user_type) + '</td>' +
      '<td data-label="Status"><span class="uad-badge b-' + esc(u.status) + '">' + esc(u.status) + '</span></td>' +
      '<td data-label="Roles">' + roleTags(u.roles || []) + '</td>' +
      '<td data-label="Last Login">' + (u.last_login ? esc(u.last_login.slice(0, 16)) : '<span class="uad-muted">Never</span>') + '</td>' +
      '<td data-label="Actions"><button class="uad-btn" data-detail="' + i + '">View Details</button></td>' +
      '</tr>').join('');
    $$('[data-detail]').forEach(b => b.addEventListener('click', () => openDetail(state.dirRows[+b.dataset.detail])));
  }

  // ---------- details modal (uses directory API data only) ----------
  function openDetail(u){
    if (!u) return;
    const yes = '<span class="uad-badge b-Active">Yes</span>', no = '<span class="uad-badge b-Disabled">No</span>';
    $('[data-role="m-title"]').textContent = u.full_name;
    $('[data-role="m-body"]').innerHTML = '<dl class="uad-dl">' +
      '<dt>Full Name</dt><dd>' + esc(u.full_name) + '</dd>' +
      '<dt>User ID / Email</dt><dd>' + esc(u.user) + (u.email !== u.user ? '<br>' + esc(u.email) : '') + '</dd>' +
      '<dt>Linked Employee ID</dt><dd>' + (u.employee ? esc(u.employee) : '<span class="uad-muted">' + (u.mapping_conflict ? 'Unresolved — multiple Employee records' : 'Not linked') + '</span>') + '</dd>' +
      '<dt>Department</dt><dd>' + esc(u.department) + '</dd>' +
      '<dt>Account Status</dt><dd><span class="uad-badge b-' + esc(u.status) + '">' + esc(u.status) + '</span></dd>' +
      '<dt>Enabled</dt><dd>' + (u.enabled ? yes : no) + '</dd>' +
      '<dt>User Type</dt><dd>' + esc(u.user_type) + '</dd>' +
      '<dt>Last Successful Login</dt><dd>' + (u.last_login ? esc(u.last_login) + ' <span class="uad-muted">(Asia/Riyadh)</span>' : 'Never') + '</dd>' +
      '<dt>Privileged Access</dt><dd>' + (u.privileged ? '<span class="uad-badge b-priv">★ Privileged</span>' : 'No') + '</dd>' +
      '<dt>Employee Mapping Conflict</dt><dd>' + (u.mapping_conflict ? '<span class="uad-badge b-conf">⚠ Yes — ' + u.employee_links + ' linked Employee records</span>' : 'No') + '</dd>' +
      '<dt>Assigned Roles (' + (u.roles || []).length + ')</dt><dd><div class="uad-roles" style="max-width:none">' +
        ((u.roles || []).map(r => '<span class="uad-role' + (PRIV_ROLES.indexOf(r) >= 0 ? ' p' : '') + '">' + esc(r) + '</span>').join('') || 'None') + '</div></dd>' +
      '</dl>';
    // Step 6: only System Manager holders (server flag + client role check) may open the ERPNext User form
    const isSysMgr = !!(window.frappe && frappe.user_roles && frappe.user_roles.indexOf('System Manager') >= 0);
    const canOpen = !!u.can_open && isSysMgr && !!(window.frappe && frappe.model && frappe.model.can_read && frappe.model.can_read('User'));
    const a = $('[data-role="m-open"]');
    a.hidden = !canOpen;
    a.href = canOpen ? '/app/user/' + encodeURIComponent(u.user) : '#';
    $('[data-role="m-note"]').textContent = canOpen ? '' : 'You do not have permission to open User records in ERPNext.';
    $('[data-role="modal"]').hidden = false;
  }
  function closeDetail(){ $('[data-role="modal"]').hidden = true; }
  $('[data-role="m-close"]').addEventListener('click', closeDetail);
  $('[data-role="modal"]').addEventListener('click', e => { if (e.target === $('[data-role="modal"]')) closeDetail(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('[data-role="modal"]').hidden) closeDetail(); });

  // ---------- directory controls ----------
  let searchTimer = null;
  $$('[data-f]').forEach(el => {
    const k = el.dataset.f;
    if (el.closest('.uad-filters') === null && k !== 'page_size') return;
    const ev = k === 'search' ? 'input' : 'change';
    el.addEventListener(ev, () => {
      state.dir[k] = k === 'page_size' ? parseInt(el.value, 10) : el.value.trim();
      state.dir.page = 1;
      if (k === 'search') { clearTimeout(searchTimer); searchTimer = setTimeout(loadDir, 350); } else loadDir();
    });
  });
  $$('.uad-table th[data-sort]').forEach(th => th.addEventListener('click', () => {
    const f = th.dataset.sort;
    if (state.dir.sort_by === f) state.dir.sort_order = state.dir.sort_order === 'asc' ? 'desc' : 'asc';
    else { state.dir.sort_by = f; state.dir.sort_order = f === 'last_login' ? 'desc' : 'asc'; }
    state.dir.page = 1; loadDir();
  }));
  $('[data-page="prev"]').addEventListener('click', () => { if (state.dir.page > 1) { state.dir.page--; loadDir(); } });
  $('[data-page="next"]').addEventListener('click', () => { state.dir.page++; loadDir(); });
  $('[data-role="reset"]').addEventListener('click', () => { state.dir = Object.assign({}, DIR_DEFAULT, { page_size: state.dir.page_size }); loadDir(); });
  $$('[data-drill]').forEach(k => k.addEventListener('click', () => openDirectory({ status: k.dataset.drill.toLowerCase() })));
  $$('.uad-tabs button').forEach(b => b.addEventListener('click', () => { if (b.dataset.tab === 'directory' && !state.dirLoaded) { state.dirLoaded = true; loadDir(); } }));
  syncControls();

  // ---------- Role Access (live) ----------
  const R_DEFAULT = { search: '', kind: 'all', assigned: 'assigned', sort: 'total', order: 'desc', page: 1, page_size: 20 };
  state.r = Object.assign({}, R_DEFAULT);
  state.rData = null; state.rLoaded = false; state.rLoading = false;
  state.rm = { role: null, users: [], page: 1, perms: null, permsLoaded: false, seq: 0 };
  const refDate = () => (state.data && state.data.report_timestamp) ? state.data.report_timestamp.slice(0, 10) : '';
  async function apiGet(path, params){
    const p = Object.assign({}, params || {}); const rd = refDate(); if (rd) p.ref_date = rd;
    let r = await fetch(path + '?' + new URLSearchParams(p), { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
    let j = null; try { j = await r.json(); } catch (e) {}
    if (!r.ok && r.status === 417 && p.ref_date && j && /Reference date/.test(j._server_messages || '')) {
      delete p.ref_date;
      r = await fetch(path + '?' + new URLSearchParams(p), { credentials: 'same-origin' });
      j = null; try { j = await r.json(); } catch (e) {}
    }
    if (!r.ok || !j || !j.message) {
      let msg = 'Could not load data (HTTP ' + r.status + ').';
      try { const m = JSON.parse(JSON.parse(j._server_messages)[0]).message; if (m) msg = m; } catch (e) {}
      if (r.status === 403) msg = 'You are not permitted to view this data.';
      throw new Error(msg);
    }
    return j.message;
  }
  function errBox(sel, msg, retry){
    const box = $(sel); if (!msg) { box.hidden = true; return; }
    box.innerHTML = '<span>' + esc(msg) + '</span><button type="button">Retry</button>'; box.hidden = false;
    box.querySelector('button').addEventListener('click', retry);
  }
  async function loadRoles(){
    state.rLoading = true; errBox('[data-role="r-error"]', null);
    $$('[data-rk]').forEach(e => e.textContent = '…');
    $('[data-role="r-body"]').innerHTML = '<tr><td colspan="7" class="full"><div class="uad-skel" style="height:60px"></div></td></tr>';
    $('[data-role="r-count"]').textContent = 'Loading…';
    try {
      state.rData = await apiGet('/api/method/user_access_roles', {});
      state.rLoading = false;
      renderRoles();
    } catch (e) {
      state.rLoading = false; state.rData = null;
      $$('[data-rk]').forEach(el => el.textContent = '—');
      $('[data-role="r-body"]').innerHTML = '<tr><td colspan="7" class="full"><div class="uad-empty">Role data unavailable.</div></td></tr>';
      $('[data-role="r-count"]').textContent = '—'; $('[data-role="r-page"]').textContent = '—';
      errBox('[data-role="r-error"]', e.message, loadRoles);
    }
  }
  function filteredRoles(){
    const f = state.r, q = f.search.toLowerCase();
    let list = (state.rData.roles || []).filter(r => {
      if (q && r.role.toLowerCase().indexOf(q) < 0) return false;
      if (f.kind === 'privileged' && !r.privileged) return false;
      if (f.kind === 'standard' && r.privileged) return false;
      if (f.kind === 'important' && !r.important) return false;
      if (f.assigned === 'assigned' && !r.total) return false;
      if (f.assigned === 'unassigned' && r.total) return false;
      return true;
    });
    const k = f.sort, dir = f.order === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let x = a[k], y = b[k];
      if (k === 'role') { x = x.toLowerCase(); y = y.toLowerCase(); }
      if (x < y) return -dir; if (x > y) return dir;
      return a.role.toLowerCase() < b.role.toLowerCase() ? -1 : 1;
    });
    return list;
  }
  function renderRoles(){
    const d = state.rData; if (!d) return;
    $$('[data-rk]').forEach(e => e.textContent = fmt(d[e.dataset.rk]));
    $('[data-rk-sub="total_roles"]').textContent = 'All Role records · ' + d.disabled_roles + ' disabled';
    $('[data-rk-sub="roles_assigned"]').textContent = '≥1 in-scope user · ' + d.roles_unassigned + ' unassigned';
    $$('[data-rf]').forEach(el => { if (el.dataset.rf in state.r) el.value = String(state.r[el.dataset.rf]); });
    $$('th[data-rsort]').forEach(th => {
      const on = th.dataset.rsort === state.r.sort; th.classList.toggle('sorted', on);
      let ar = th.querySelector('.ar'); if (!ar) { ar = document.createElement('span'); ar.className = 'ar'; th.appendChild(ar); }
      ar.textContent = on ? (state.r.order === 'asc' ? '▲' : '▼') : '↕';
    });
    const list = filteredRoles();
    const ps = state.r.page_size, pages = Math.max(1, Math.ceil(list.length / ps));
    if (state.r.page > pages) state.r.page = pages;
    const rows = list.slice((state.r.page - 1) * ps, state.r.page * ps);
    $('[data-role="r-count"]').textContent = fmt(list.length) + ' of ' + fmt((d.roles || []).length) + ' roles';
    $('[data-role="r-page"]').textContent = list.length ? ('Page ' + state.r.page + ' of ' + pages) : 'No pages';
    $('[data-rpage="prev"]').disabled = state.r.page <= 1;
    $('[data-rpage="next"]').disabled = state.r.page >= pages;
    if (!rows.length) { $('[data-role="r-body"]').innerHTML = '<tr><td colspan="7" class="full"><div class="uad-empty">No roles match the selected filters.</div></td></tr>'; return; }
    $('[data-role="r-body"]').innerHTML = rows.map(r =>
      '<tr class="' + (r.privileged ? 'r-priv' : (r.important ? 'r-imp' : '')) + '">' +
      '<td data-label="Role"><span class="uad-rname">' + esc(r.role) + '</span>' +
        (r.privileged ? ' <span class="uad-role p">Privileged</span>' : (r.important ? ' <span class="uad-role imp">Highlighted</span>' : '')) +
        (r.role_disabled ? '<span class="uad-tag dis">Role disabled</span>' : '') + '</td>' +
      '<td data-label="Total Users" class="num">' + fmt(r.total) + '</td>' +
      '<td data-label="Active" class="num" style="color:#1E8E5A">' + fmt(r.active) + '</td>' +
      '<td data-label="Inactive" class="num" style="color:#9A6A06">' + fmt(r.inactive) + '</td>' +
      '<td data-label="Disabled" class="num" style="color:#B4413C">' + fmt(r.disabled) + '</td>' +
      '<td data-label="Privileged">' + (r.privileged ? '<span class="uad-badge b-priv">★ Yes</span>' : '<span class="uad-muted">No</span>') + '</td>' +
      '<td data-label="Details"><button class="uad-btn" data-rdetail="' + esc(r.role) + '">Details</button></td></tr>').join('');
    $$('[data-rdetail]').forEach(b => b.addEventListener('click', () => openRole(b.dataset.rdetail)));
  }
  let rSearchTimer = null;
  $$('[data-rf]').forEach(el => {
    const k = el.dataset.rf;
    el.addEventListener(k === 'search' ? 'input' : 'change', () => {
      state.r[k] = k === 'page_size' ? parseInt(el.value, 10) : el.value.trim(); state.r.page = 1;
      if (k === 'search') { clearTimeout(rSearchTimer); rSearchTimer = setTimeout(renderRoles, 200); } else renderRoles();
    });
  });
  $$('th[data-rsort]').forEach(th => th.addEventListener('click', () => {
    const k = th.dataset.rsort;
    if (state.r.sort === k) state.r.order = state.r.order === 'asc' ? 'desc' : 'asc';
    else { state.r.sort = k; state.r.order = k === 'role' ? 'asc' : 'desc'; }
    state.r.page = 1; renderRoles();
  }));
  $('[data-rpage="prev"]').addEventListener('click', () => { if (state.r.page > 1) { state.r.page--; renderRoles(); } });
  $('[data-rpage="next"]').addEventListener('click', () => { state.r.page++; renderRoles(); });
  $('[data-role="r-reset"]').addEventListener('click', () => { state.r = Object.assign({}, R_DEFAULT, { page_size: state.r.page_size }); renderRoles(); });
  $('[data-role="r-privusers"]').addEventListener('click', () => openDirectory({ status: 'privileged', department: '' }));
  $$('.uad-tabs button').forEach(b => b.addEventListener('click', () => { if (b.dataset.tab === 'roles' && !state.rLoaded) { state.rLoaded = true; loadRoles(); } }));

  // ---- role drill-down modal ----
  const RM_PS = 20;
  function rmTab(t){
    $$('[data-rmtab]').forEach(b => b.classList.toggle('active', b.dataset.rmtab === t));
    $$('[data-rmpane]').forEach(p => p.hidden = p.dataset.rmpane !== t);
    if (t === 'perms' && !state.rm.permsLoaded) loadPerms();
  }
  $$('[data-rmtab]').forEach(b => b.addEventListener('click', () => rmTab(b.dataset.rmtab)));
  async function openRole(role){
    const info = (state.rData && state.rData.roles || []).find(x => x.role === role) || { role: role };
    state.rm = { role: role, users: [], page: 1, perms: null, permsLoaded: false, seq: state.rm.seq + 1 };
    const seq = state.rm.seq;
    $('[data-role="rm-title"]').textContent = role;
    $('[data-role="rm-chips"]').innerHTML =
      (info.privileged ? '<span class="uad-role p">Privileged role</span>' : (info.important ? '<span class="uad-role imp">Highlighted role (not in privileged set)</span>' : '<span class="uad-chip">Standard role</span>')) +
      (info.total != null ? '<span class="uad-chip">' + fmt(info.total) + ' users · ' + fmt(info.active) + ' active · ' + fmt(info.inactive) + ' inactive · ' + fmt(info.disabled) + ' disabled</span>' : '') +
      (info.role_disabled ? '<span class="uad-chip" style="background:#FBEAE9;color:#B4413C">Role is disabled</span>' : '');
    const dirBtn = $('[data-role="rm-dir"]');
    dirBtn.disabled = !info.total; dirBtn.title = info.total ? '' : 'No in-scope users hold this role';
    $('[data-role="pm-search"]').value = '';
    errBox('[data-role="rm-error"]', null);
    $('[data-role="rm-body"]').innerHTML = '<tr><td colspan="6" class="full"><div class="uad-skel" style="height:60px"></div></td></tr>';
    $('[data-role="rm-count"]').textContent = 'Loading…'; $('[data-role="rm-page"]').textContent = '—';
    rmTab('users');
    $('[data-role="rmodal"]').hidden = false;
    try {
      const m = await apiGet('/api/method/user_access_roles', { mode: 'users', role: role });
      if (seq !== state.rm.seq) return;
      state.rm.users = m.users || []; renderRoleUsers();
    } catch (e) {
      if (seq !== state.rm.seq) return;
      $('[data-role="rm-body"]').innerHTML = '<tr><td colspan="6" class="full"><div class="uad-empty">Assigned users unavailable.</div></td></tr>';
      $('[data-role="rm-count"]').textContent = '—';
      errBox('[data-role="rm-error"]', e.message, () => openRole(role));
    }
  }
  function renderRoleUsers(){
    const list = state.rm.users, pages = Math.max(1, Math.ceil(list.length / RM_PS));
    if (state.rm.page > pages) state.rm.page = pages;
    const rows = list.slice((state.rm.page - 1) * RM_PS, state.rm.page * RM_PS);
    $('[data-role="rm-count"]').textContent = fmt(list.length) + ' assigned user' + (list.length === 1 ? '' : 's');
    $('[data-role="rm-page"]').textContent = 'Page ' + state.rm.page + ' of ' + pages;
    $('[data-rmpage="prev"]').disabled = state.rm.page <= 1; $('[data-rmpage="next"]').disabled = state.rm.page >= pages;
    $('[data-role="rm-body"]').innerHTML = rows.length ? rows.map(u =>
      '<tr><td data-label="Full Name"><span class="nm">' + esc(u.full_name) + '</span></td>' +
      '<td data-label="Email" class="em">' + esc(u.email) + '</td>' +
      '<td data-label="Department">' + esc(u.department) + (u.mapping_conflict ? ' <span class="uad-badge b-conf">⚠ conflict</span>' : '') + '</td>' +
      '<td data-label="Status"><span class="uad-badge b-' + esc(u.status) + '">' + esc(u.status) + '</span></td>' +
      '<td data-label="User Type">' + esc(u.user_type) + '</td>' +
      '<td data-label="Last Login">' + (u.last_login ? esc(u.last_login.slice(0, 16)) : '<span class="uad-muted">Never</span>') + '</td></tr>').join('')
      : '<tr><td colspan="6" class="full"><div class="uad-empty">No in-scope users hold this role.</div></td></tr>';
  }
  $('[data-rmpage="prev"]').addEventListener('click', () => { if (state.rm.page > 1) { state.rm.page--; renderRoleUsers(); } });
  $('[data-rmpage="next"]').addEventListener('click', () => { state.rm.page++; renderRoleUsers(); });
  async function loadPerms(){
    const seq = state.rm.seq, role = state.rm.role;
    $('[data-role="pm-body"]').innerHTML = '<tr><td colspan="7" class="full"><div class="uad-skel" style="height:60px"></div></td></tr>';
    $('[data-role="pm-count"]').textContent = '';
    try {
      const m = await apiGet('/api/method/user_access_roles', { mode: 'permissions', role: role });
      if (seq !== state.rm.seq) return;
      state.rm.perms = m.permissions || []; state.rm.permsLoaded = true; renderPerms();
    } catch (e) {
      if (seq !== state.rm.seq) return;
      $('[data-role="pm-body"]').innerHTML = '<tr><td colspan="7" class="full"><div class="uad-empty">' + esc(e.message) + '</div></td></tr>';
    }
  }
  function renderPerms(){
    const q = $('[data-role="pm-search"]').value.trim().toLowerCase();
    const list = (state.rm.perms || []).filter(p => !q || p.doctype.toLowerCase().indexOf(q) >= 0);
    const yn = v => v ? '<span class="uad-yes">✓</span>' : '<span class="uad-no">–</span>';
    $('[data-role="pm-body"]').innerHTML = list.length ? list.map(p =>
      '<tr><td data-label="DocType">' + esc(p.doctype) + (p.source === 'Custom' ? ' <span class="uad-muted">(customised)</span>' : '') + '</td>' +
      ['read','write','create','delete','submit','export'].map(k => '<td data-label="' + k.charAt(0).toUpperCase() + k.slice(1) + '">' + yn(p[k]) + '</td>').join('') + '</tr>').join('')
      : '<tr><td colspan="7" class="full"><div class="uad-empty">' + ((state.rm.perms || []).length ? 'No DocTypes match the filter.' : 'This role has no level-0 DocType permission rules configured.') + '</div></td></tr>';
    $('[data-role="pm-count"]').textContent = fmt(list.length) + ' DocType rule' + (list.length === 1 ? '' : 's') + ' shown';
  }
  $('[data-role="pm-search"]').addEventListener('input', () => { if (state.rm.permsLoaded) renderPerms(); });
  function closeRole(){ $('[data-role="rmodal"]').hidden = true; state.rm.seq++; }
  $('[data-role="rm-close"]').addEventListener('click', closeRole);
  $('[data-role="rmodal"]').addEventListener('click', e => { if (e.target === $('[data-role="rmodal"]')) closeRole(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('[data-role="rmodal"]').hidden) closeRole(); });
  $('[data-role="rm-dir"]').addEventListener('click', () => { const role = state.rm.role; closeRole(); openDirectory({ role: role, department: '' }); });

  // ---------- data ----------
  function setState(text, cls){
    const p = $('[data-role="state"]');
    p.textContent = text; p.className = 'uad-pill' + (cls ? ' ' + cls : '');
  }
  function setLoading(){
    state.loading = true;
    setState('Loading…');
    $('[data-role="error"]').hidden = true;
    $$('[data-kpi]').forEach(e => e.textContent = '…');
    ['status','depts','recs'].forEach(r => $('[data-role="' + r + '"]').innerHTML = '<div class="uad-skel"></div>');
  }
  function showError(msg){
    state.loading = false;
    setState('Data unavailable', 'err');
    $$('[data-kpi]').forEach(e => e.textContent = '—');
    ['status','depts','recs'].forEach(r => $('[data-role="' + r + '"]').innerHTML = '<div class="uad-empty">Data unavailable — figures are not shown rather than displaying misleading zeros.</div>');
    const box = $('[data-role="error"]');
    box.innerHTML = '<span>' + esc(msg) + '</span><button type="button">Retry</button>';
    box.hidden = false;
    box.querySelector('button').addEventListener('click', load);
  }

  async function load(){
    setLoading();
    const qs = state.dept ? ('?department=' + encodeURIComponent(state.dept)) : '';
    try {
      const r = await fetch('/api/method/user_access_summary' + qs, { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' });
      let j = null; try { j = await r.json(); } catch (e) {}
      if (!r.ok || !j || !j.message) {
        let msg = 'Could not load dashboard data (HTTP ' + r.status + ').';
        if (r.status === 403 || r.status === 417) msg = 'You are not permitted to view this dashboard data.';
        throw new Error(msg);
      }
      state.data = j.message;
      state.loading = false;
      render();
    } catch (e) {
      showError(e.message || 'Could not load dashboard data.');
    }
  }

  function render(){
    const d = state.data;
    // department selector
    const sel = $('[data-role="dept"]');
    if (sel.options.length <= 1 && d.department_options) {
      d.department_options.forEach(o => { const op = document.createElement('option'); op.value = o; op.textContent = o; sel.appendChild(op); });
    }
    sel.disabled = false; sel.value = state.dept;

    // KPIs
    $$('[data-kpi]').forEach(e => e.textContent = fmt(d[e.dataset.kpi]));
    const pct = n => d.total_users ? ' · ' + (n * 100 / d.total_users).toFixed(1) + '%' : '';
    $('[data-sub="active_users"]').textContent = 'Enabled · login within 15 days' + pct(d.active_users);
    $('[data-sub="inactive_users"]').textContent = 'Enabled · no login in 15+ days' + pct(d.inactive_users);
    $('[data-sub="disabled_users"]').textContent = 'Account disabled' + pct(d.disabled_users);

    // status distribution
    $('[data-role="total"]').textContent = fmt(d.total_users) + ' users in scope';
    const dist = d.status_distribution || [];
    if (!d.total_users) {
      $('[data-role="status"]').innerHTML = '<div class="uad-empty">No users in this selection.</div>';
    } else {
      const seg = dist.filter(s => s.count > 0).map(s =>
        '<button data-status="' + esc(s.status) + '" title="' + esc(s.status + ': ' + s.count + ' (' + s.percent + '%)') + '" style="flex:' + s.count + ';background:' + COLORS[s.status] + '">' + (s.percent >= 8 ? s.percent + '%' : '') + '</button>').join('');
      const leg = dist.map(s =>
        '<button data-status="' + esc(s.status) + '"><span class="uad-dot" style="background:' + COLORS[s.status] + '"></span>' + esc(s.status) + '<span class="n">' + fmt(s.count) + '</span><span class="p">' + s.percent + '%</span></button>').join('');
      $('[data-role="status"]').innerHTML = '<div class="uad-seg">' + seg + '</div><div class="uad-legend">' + leg + '</div>';
      $$('[data-role="status"] [data-status]').forEach(b => b.addEventListener('click', () => openDirectory({ status: b.dataset.status.toLowerCase() })));
    }

    // departments
    const depts = d.department_distribution || [];
    const max = Math.max(1, ...depts.map(x => x.count));
    const LIMIT = 10;
    const list = state.showAllDepts ? depts : depts.slice(0, LIMIT);
    const more = $('[data-role="dept-more"]');
    more.hidden = depts.length <= LIMIT;
    more.textContent = state.showAllDepts ? 'Show top ' + LIMIT : 'Show all (' + depts.length + ')';
    $('[data-role="depts"]').innerHTML = depts.length ? '<div class="uad-bars">' + list.map(x => {
      const cls = x.department.indexOf('Unassigned') === 0 ? ' un' : (x.department === 'Mapping Conflict' ? ' cf' : '');
      return '<button class="uad-bar' + cls + '" data-dept="' + esc(x.department) + '" title="' + esc(x.department) + '"><span class="nm">' + esc(x.department) + '</span><span class="tr"><span class="fl" style="display:block;width:' + (x.count * 100 / max) + '%"></span></span><span class="ct">' + fmt(x.count) + '</span></button>';
    }).join('') + '</div>' : '<div class="uad-empty">No department data for this selection.</div>';
    $$('[data-role="depts"] [data-dept]').forEach(b => b.addEventListener('click', () => openDirectory({ department: b.dataset.dept })));

    // recommendations
    const q = d.data_quality || {};
    const recs = [
      { k: 'enabled_inactive_15_plus', t: 'Enabled, no login in 15+ days', c: '#C98A0B', f: { inactivity: '15' } },
      { k: 'enabled_inactive_30_plus', t: 'Enabled, no login in 30+ days', c: '#B4413C', f: { inactivity: '30' } },
      { k: 'without_employee_link', t: 'Users without Employee link', c: '#66758A', f: { department: 'Unassigned – No Employee Link' }, own: true },
      { k: 'without_department', t: 'Linked, but no Department', c: '#66758A', f: { department: 'Unassigned – No Department' }, own: true },
      { k: 'privileged_enabled', t: 'Enabled users with privileged roles', c: '#102F52', f: { status: 'privileged' } }
    ];
    let html = '<div class="uad-recs">' + recs.map(r =>
      '<button class="uad-rec" style="--c:' + r.c + '" data-rec="' + r.k + '"><b>' + fmt(q[r.k]) + '</b><span>' + esc(r.t) + '</span></button>').join('') + '</div>';
    if (q.mapping_conflicts) html += '<p class="uad-muted" style="margin:10px 0 0">⚠ ' + q.mapping_conflicts + ' user(s) are linked to more than one Employee record and are flagged for review.</p>';
    $('[data-role="recs"]').innerHTML = html;
    $$('[data-rec]').forEach(b => { const r = recs.find(x => x.k === b.dataset.rec); b.addEventListener('click', () => openDirectory(r.f)); });

    // meta
    setState('Live · updated ' + (d.report_timestamp || '').slice(11, 16), 'ok');
    $('[data-role="foot"]').textContent = 'Read-only · ' + (d.timezone || 'Asia/Riyadh') + ' · Last refreshed ' + (d.report_timestamp || '').slice(0, 19) +
      ' · 15-day cutoff ' + (d.cutoff_15_days || '') + ' · Scope: ' + (d.scope || '');
  }

  $('[data-role="dept"]').addEventListener('change', e => { state.dept = e.target.value; load(); });
  $('[data-role="refresh"]').addEventListener('click', () => { if (!state.loading) load(); });
  $('[data-role="dept-more"]').addEventListener('click', () => { state.showAllDepts = !state.showAllDepts; render(); });

  // ===== Overview analytics (charts A–F + security insights) — added 2026-10-29 =====
  // Data: read-only aggregate API "user_access_analytics" (same access rule as the Summary API).
  // Drill-downs reuse openDirectory() with the User Directory API's own filters.
  (function analytics(){
    const box = $('[data-role="uaa"]'); if (!box) return;
    const A = { department: '', user_type: '', status: '', from_date: '', to_date: '', seq: 0 };
    const SC = { Active: '#1E8E5A', Inactive: '#C98A0B', Disabled: '#B4413C' };
    const TC = { 'System User': '#102F52', 'Website User': '#3B82C4' };
    const AGE = [
      { k: 'within_15', l: 'Active: within 15 days', c: '#1E8E5A', f: { status: 'active' } },
      { k: 'd16_30', l: 'Inactive: 16–30 days', c: '#E0B23A', f: { inactivity: 'b16_30' } },
      { k: 'd31_60', l: 'Inactive: 31–60 days', c: '#C98A0B', f: { inactivity: 'b31_60' } },
      { k: 'over_60', l: 'Inactive: over 60 days', c: '#B4413C', f: { inactivity: 'b61' } },
      { k: 'never', l: 'Never logged in', c: '#7A8699', f: { inactivity: 'never' } }
    ];
    const DQ = [
      { k: 'without_employee_link', l: 'Users without Employee links', f: { department: 'Unassigned – No Employee Link' } },
      { k: 'without_department', l: 'Users without assigned departments', f: { department: 'Unassigned – No Department' } },
      { k: 'mapping_conflicts', l: 'Employee mapping conflicts', f: { flag: 'conflict' } },
      { k: 'enabled_inactive_30_plus', l: 'Enabled users inactive over 30 days', f: { inactivity: '30' } },
      { k: 'privileged_inactive', l: 'Enabled privileged users who are inactive', f: { status: 'privileged', inactivity: '15' } },
      { k: 'multiple_privileged_roles', l: 'Users with multiple privileged roles', f: { flag: 'multi_priv' } }
    ];
    const pct = (n, t) => t ? (Math.round(n * 1000 / t) / 10).toFixed(1) + '%' : '0.0%';
    const go = f => openDirectory(Object.assign({}, f));
    const base = () => { const f = {}; if (A.department) f.department = A.department; if (A.user_type) f.user_type = A.user_type; if (A.status) f.status = A.status.toLowerCase(); return f; };
    const slot = k => box.querySelector('[data-c="' + k + '"]');
    const loading = () => box.querySelectorAll('[data-c]').forEach(el => { el.innerHTML = '<div class="uad-skel" style="height:120px"></div>'; });
    const failed = msg => box.querySelectorAll('[data-c]').forEach(el => { el.innerHTML = '<div class="uaa-err"><b>Chart unavailable</b><span>' + esc(msg) + '</span></div>'; });
    const empty = '<div class="uaa-empty">No users match the selected filters.</div>';

    function legendRow(color, label, n, total, attrs){
      return '<button class="uaa-lg" ' + attrs + '><i style="background:' + color + '"></i><span class="uaa-lt">' + esc(label) + '</span><b>' + fmt(n) + '</b><em>' + pct(n, total) + '</em></button>';
    }
    function donut(key, items, total, centre){
      const r = 42, C = 2 * Math.PI * r; let off = 0;
      const segs = items.map((it, i) => {
        const len = total ? it.n / total * C : 0;
        const s = '<circle r="' + r + '" cx="60" cy="60" fill="none" stroke="' + it.c + '" stroke-width="16" stroke-dasharray="' + len + ' ' + (C - len) + '" stroke-dashoffset="' + (-off) + '" data-i="' + i + '" class="uaa-seg"><title>' + esc(it.l) + ': ' + it.n + ' (' + pct(it.n, total) + ')</title></circle>';
        off += len; return it.n ? s : '';
      }).join('');
      slot(key).innerHTML = total ? '<div class="uaa-pie"><svg viewBox="0 0 120 120" role="img"><g transform="rotate(-90 60 60)">' + segs + '</g><text x="60" y="58" text-anchor="middle" class="uaa-ct">' + fmt(total) + '</text><text x="60" y="74" text-anchor="middle" class="uaa-cs">' + esc(centre) + '</text></svg><div class="uaa-legend">' + items.map((it, i) => legendRow(it.c, it.l, it.n, total, 'data-i="' + i + '"')).join('') + '</div></div>' : empty;
      slot(key).querySelectorAll('[data-i]').forEach(el => el.addEventListener('click', () => go(items[+el.dataset.i].f)));
    }
    function hbars(key, rows, max, unitLabel){
      slot(key).innerHTML = rows.length ? '<div class="uaa-hb">' + rows.map((r, i) => '<button class="uaa-hr" data-i="' + i + '" title="' + esc(r.l) + ': ' + r.n + '"><span class="uaa-hl">' + esc(r.l) + '</span><span class="uaa-ht"><i style="width:' + (max ? Math.max(2, r.n * 100 / max) : 0) + '%;background:' + (r.c || '#1B4A7A') + '"></i></span><b>' + fmt(r.n) + '</b></button>').join('') + '</div><small class="uaa-foot">' + esc(unitLabel) + '</small>' : empty;
      slot(key).querySelectorAll('[data-i]').forEach(el => el.addEventListener('click', () => go(rows[+el.dataset.i].f)));
    }
    function stacked(rows){
      const el = slot('dept');
      if (!rows.length) { el.innerHTML = empty; return; }
      const max = Math.max.apply(null, rows.map(r => r.total));
      el.innerHTML = '<div class="uaa-keys">' + ['Active', 'Inactive', 'Disabled'].map(s => '<span><i style="background:' + SC[s] + '"></i>' + s + '</span>').join('') + '</div><div class="uaa-sb">' + rows.map((r, i) => '<div class="uaa-sr"><span class="uaa-hl" title="' + esc(r.department) + '">' + esc(r.department) + '</span><span class="uaa-st" style="width:' + Math.max(4, r.total * 100 / max) + '%">' + ['Active', 'Inactive', 'Disabled'].map(s => r[s] ? '<button data-i="' + i + '" data-s="' + s + '" style="flex:' + r[s] + ';background:' + SC[s] + '" title="' + esc(r.department) + ' · ' + s + ': ' + r[s] + ' (' + pct(r[s], r.total) + ')"></button>' : '').join('') + '</span><b>' + fmt(r.total) + '</b></div>').join('') + '</div>';
      el.querySelectorAll('button[data-i]').forEach(b => b.addEventListener('click', () => { const r = rows[+b.dataset.i]; go({ department: r.department, status: b.dataset.s.toLowerCase(), user_type: A.user_type || '' }); }));
    }
    function trend(rows){
      const el = slot('trend');
      if (!rows.length) { el.innerHTML = empty; return; }
      const max = Math.max(1, Math.max.apply(null, rows.map(r => r.count)));
      const tot = rows.reduce((a, r) => a + r.count, 0);
      el.innerHTML = '<div class="uaa-cols">' + rows.map(r => '<div class="uaa-col" title="' + r.month + ': ' + r.count + '"><b>' + (r.count || '') + '</b><i style="height:' + (r.count * 100 / max) + '%"></i><span>' + r.month.slice(2).replace('-', '/') + '</span></div>').join('') + '</div><small class="uaa-foot"><span>New user accounts in range</span>: <b>' + fmt(tot) + '</b></small>';
    }
    function dq(d){
      const el = box.querySelector('[data-role="uaa-dq"]');
      el.innerHTML = DQ.map((x, i) => '<button class="uaa-dqc' + (d[x.k] ? ' on' : '') + '" data-i="' + i + '"><b>' + fmt(d[x.k] || 0) + '</b><span>' + esc(x.l) + '</span></button>').join('');
      el.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => go(DQ[+b.dataset.i].f)));
    }
    function draw(d){
      const tot = d.total_in_scope || 0;
      donut('status', d.status.map(x => ({ l: x.status, n: x.count, c: SC[x.status], f: Object.assign(base(), { status: x.status.toLowerCase() }) })), tot, 'Users');
      donut('type', d.user_type.map(x => ({ l: x.user_type, n: x.count, c: TC[x.user_type] || '#7A8699', f: Object.assign(base(), { user_type: x.user_type }) })), tot, 'Users');
      stacked(d.department_status || []);
      const ag = d.login_ageing || {}; const amax = Math.max.apply(null, AGE.map(a => ag[a.k] || 0));
      hbars('age', AGE.map(a => ({ l: a.l, n: ag[a.k] || 0, c: a.c, f: Object.assign(base(), a.f, a.f.status ? {} : { status: 'all' }) })), amax, 'Enabled accounts only · disabled accounts excluded');
      const rl = d.top_roles || []; const rmax = rl.length ? rl[0].users : 0;
      hbars('roles', rl.map(r => ({ l: r.role, n: r.users, f: Object.assign(base(), { role: r.role }) })), rmax, 'Distinct users per role · automatic roles excluded');
      trend(d.creation_trend || []);
      dq(d.data_quality || {});
      const meta = box.querySelector('[data-role="uaa-meta"]'); if (meta) meta.textContent = (d.report_timestamp || '').slice(0, 16);
    }
    async function fetchA(){
      const seq = ++A.seq; loading();
      const p = {}; ['department', 'user_type', 'status', 'from_date', 'to_date'].forEach(k => { if (A[k]) p[k] = A[k]; });
      try {
        const r = await fetch('/api/method/user_access_analytics?' + new URLSearchParams(p), { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
        let j = null; try { j = await r.json(); } catch (e) {}
        if (seq !== A.seq) return;
        if (!r.ok || !j || !j.message) { failed((j && j._server_messages) ? 'The server rejected the request.' : 'Analytics could not be loaded (HTTP ' + r.status + ').'); return; }
        const d = j.message;
        if (!A.from_date) { A.from_date = d.filters.from_date; A.to_date = d.filters.to_date; box.querySelector('[data-a="from_date"]').value = A.from_date; box.querySelector('[data-a="to_date"]').value = A.to_date; }
        draw(d);
      } catch (e) { if (seq === A.seq) failed('Analytics could not be loaded. Check your connection and try again.'); }
    }
    // department options mirror the header department list (same reporting groups)
    function syncDeptOptions(){
      const src = $('[data-role="dept"]'), dst = box.querySelector('[data-a="department"]');
      if (!src || !dst || dst.options.length > 1 || src.options.length < 2) return;
      [].slice.call(src.options).slice(1).forEach(o => { const n = document.createElement('option'); n.value = o.value; n.textContent = o.textContent; n.setAttribute('data-raw', ''); dst.appendChild(n); });
    }
    box.querySelectorAll('select[data-a]').forEach(s => s.addEventListener('change', () => { A[s.dataset.a] = s.value; fetchA(); }));
    box.querySelector('[data-role="uaa-apply"]').addEventListener('click', () => {
      const f = box.querySelector('[data-a="from_date"]').value, t = box.querySelector('[data-a="to_date"]').value;
      const msg = box.querySelector('[data-role="uaa-dmsg"]');
      if (!f || !t || t < f) { msg.hidden = false; return; }
      msg.hidden = true; A.from_date = f; A.to_date = t; fetchA();
    });
    const tryOpts = setInterval(() => { syncDeptOptions(); if (box.querySelector('[data-a="department"]').options.length > 1) clearInterval(tryOpts); }, 500);
    setTimeout(() => clearInterval(tryOpts), 15000);
    fetchA();
  })();

  // ===== English | العربية (UI labels only; ERP values stay as stored) — added 2026-10-29 =====
  (function i18n(){
    const ui = root.querySelector('.uad'); if (!ui) return;
    const KEY = 'uad_lang_v1';
    let lang = 'en'; try { lang = localStorage.getItem(KEY) === 'ar' ? 'ar' : 'en'; } catch (e) {}
    const AR = {
      'Today': 'اليوم', 'This Week': 'هذا الأسبوع', 'This Month': 'هذا الشهر', 'This Year': 'هذه السنة', 'Custom': 'مخصص',
      'Start Date': 'تاريخ البداية', 'End Date': 'تاريخ النهاية', 'Apply': 'تطبيق', 'Reset': 'إعادة تعيين', 'Asia/Riyadh · dates inclusive': 'توقيت الرياض · التواريخ شاملة',
      'Current snapshot · not filtered by date': 'لقطة حالية · غير مفلترة بالتاريخ', 'Selected Period Analysis': 'تحليل الفترة المحددة',
      'New Users Created': 'المستخدمون الجدد المُنشأون', 'Users with Last Login in Period': 'مستخدمون آخر دخول لهم ضمن الفترة', 'Login Events in Period': 'أحداث تسجيل الدخول في الفترة',
      'User.creation within selected dates': 'تاريخ إنشاء المستخدم ضمن التواريخ المحددة',
      'Last login in selected period (current last login, not login events)': 'آخر دخول ضمن الفترة المحددة (آخر دخول حالي، وليس أحداث دخول)',
      'User Creation Trend': 'اتجاه إنشاء المستخدمين', 'Last Login Date Distribution': 'توزيع تواريخ آخر دخول', 'Daily': 'يومي', 'Monthly': 'شهري', 'Not available': 'غير متوفر',
      'No login records in Activity Log': 'لا توجد سجلات دخول في سجل النشاط',
      'Current snapshot: the KPI cards, status distribution, departments and recommendations reflect current account state and are not filtered by date.': 'لقطة حالية: بطاقات المؤشرات وتوزيع الحالات والأقسام والتوصيات تعكس الحالة الحالية للحسابات ولا تُفلتر بالتاريخ.',
      'No users were created in the selected period.': 'لم يُنشأ أي مستخدم في الفترة المحددة.', 'No user has a last login in the selected period.': 'لا يوجد مستخدم آخر دخول له ضمن الفترة المحددة.',
      'Period analysis could not be loaded.': 'تعذّر تحميل تحليل الفترة.', 'Any date': 'أي تاريخ', 'Created between dates': 'أُنشئ بين التاريخين', 'Last login between dates': 'آخر دخول بين التاريخين', 'Date basis': 'أساس التاريخ',
      'Both Start Date and End Date are required.': 'يجب إدخال تاريخ البداية وتاريخ النهاية.', 'Dates must use the format YYYY-MM-DD.': 'يجب أن تكون التواريخ بصيغة YYYY-MM-DD.',
      'Invalid calendar date.': 'تاريخ غير صالح.', 'Start Date cannot be after End Date.': 'لا يمكن أن يكون تاريخ البداية بعد تاريخ النهاية.',
      'Unsupported date range (from 2000-01-01, maximum 10 years).': 'نطاق تاريخ غير مدعوم (من 2000-01-01، بحد أقصى 10 سنوات).',
      'ERP User Access Dashboard': 'لوحة صلاحيات مستخدمي النظام',
      'DM Group KSA · Account status, roles & department access': 'مجموعة DM السعودية · حالة الحسابات والأدوار وصلاحيات الأقسام',
      'Department': 'القسم', 'All Departments': 'كل الأقسام', 'All departments': 'كل الأقسام', '↻ Refresh': '↻ تحديث',
      'Overview': 'نظرة عامة', 'User Directory': 'دليل المستخدمين', 'Role Access': 'صلاحيات الأدوار', 'Department View': 'عرض الأقسام',
      'Active Users': 'المستخدمون النشطون', 'Inactive Users': 'المستخدمون غير النشطين', 'Disabled Users': 'المستخدمون المعطّلون', 'Privileged Users': 'المستخدمون ذوو الصلاحيات العليا',
      'Enabled · admin roles (overlaps)': 'مفعّل · أدوار إدارية (متداخلة)',
      'Account Status Distribution': 'توزيع حالة الحسابات', 'Active': 'نشط', 'Inactive': 'غير نشط', 'Disabled': 'معطّل', 'Privileged': 'صلاحيات عليا',
      'Users by Department': 'المستخدمون حسب القسم', 'Access Review Recommendations': 'توصيات مراجعة الصلاحيات', 'Categories overlap — not additive': 'الفئات متداخلة — لا تُجمع',
      'Enabled, no login in 15+ days': 'مفعّل، لا دخول منذ 15 يومًا أو أكثر', 'Enabled, no login in 30+ days': 'مفعّل، لا دخول منذ 30 يومًا أو أكثر',
      'Users without Employee link': 'مستخدمون بلا ربط بموظف', 'Linked, but no Department': 'مرتبط بلا قسم', 'Enabled users with privileged roles': 'مستخدمون مفعّلون بأدوار عليا',
      'All statuses': 'كل الحالات', 'All user types': 'كل أنواع المستخدمين', 'System User': 'مستخدم نظام', 'Website User': 'مستخدم موقع', 'All roles': 'كل الأدوار',
      'Any last login': 'أي آخر دخول', 'No login in 15+ days': 'لا دخول منذ 15+ يومًا', 'No login in 30+ days': 'لا دخول منذ 30+ يومًا', 'No login in 60+ days': 'لا دخول منذ 60+ يومًا', 'Never logged in': 'لم يسجّل الدخول مطلقًا',
      'Reset filters': 'إعادة ضبط المرشحات', 'No filters applied — showing all users in scope': 'لا توجد مرشحات — عرض كل المستخدمين ضمن النطاق',
      'Full Name': 'الاسم الكامل', 'User ID / Email': 'معرّف المستخدم / البريد', 'User Type': 'نوع المستخدم', 'Status': 'الحالة', 'Assigned Roles': 'الأدوار المسندة', 'Last Login': 'آخر دخول', 'Actions': 'إجراءات', 'Rows': 'الصفوف', '‹ Prev': '‹ السابق', 'Next ›': 'التالي ›',
      'User details': 'تفاصيل المستخدم', 'Open User in ERPNext': 'فتح المستخدم في النظام', 'Total ERP Roles': 'إجمالي الأدوار', 'All Role records': 'كل سجلات الأدوار', 'Roles Assigned to Users': 'أدوار مسندة لمستخدمين', '≥1 in-scope user': 'مستخدم واحد على الأقل',
      'Privileged Roles': 'الأدوار العليا', 'Approved privileged set': 'المجموعة المعتمدة', 'Users with Privileged Access': 'مستخدمون بصلاحيات عليا', 'Enabled · counted once': 'مفعّل · يُحسب مرة واحدة', 'Role Distribution': 'توزيع الأدوار',
      'Privileged roles': 'أدوار عليا', 'Standard roles': 'أدوار عادية', 'Highlighted roles': 'أدوار مميزة', 'Assigned roles only': 'الأدوار المسندة فقط', 'Include unassigned': 'تضمين غير المسندة', 'Highlighted (not privileged)': 'مميزة (غير عليا)',
      'Role Name': 'اسم الدور', 'Total Users': 'إجمالي المستخدمين', 'Privileged Role': 'دور أعلى', 'Details': 'التفاصيل', 'Role': 'الدور', 'Assigned Users': 'المستخدمون المسندون', 'Role Permission Configuration': 'إعدادات صلاحيات الدور', 'Email': 'البريد',
      'User type': 'نوع المستخدم', 'Search': 'بحث', 'Last login': 'آخر دخول', 'Loading…': 'جارٍ التحميل…', 'View': 'عرض', 'Close': 'إغلاق',
      'User Analytics': 'تحليلات المستخدمين', 'Snapshot filters apply to charts A–E and the trend; they use current data, not history.': 'تنطبق مرشحات اللقطة على الرسوم A–E والاتجاه؛ وهي تعتمد على البيانات الحالية لا على السجل التاريخي.',
      'A · Account Status': 'أ · حالة الحساب', 'B · User Type': 'ب · نوع المستخدم', 'C · Department Status Comparison': 'ج · مقارنة حالة الأقسام', 'D · Login Ageing': 'د · مدة عدم الدخول', 'E · Users by Role (Top 10)': 'هـ · المستخدمون حسب الدور (أعلى 10)', 'F · User Creation Trend': 'و · اتجاه إنشاء المستخدمين',
      'Filters: Department, User type, Status': 'المرشحات: القسم، نوع المستخدم، الحالة', 'Filters: Department, User type, Status, Date range': 'المرشحات: القسم، نوع المستخدم، الحالة، نطاق التاريخ',
      'Users': 'مستخدمون', 'Active: within 15 days': 'نشط: خلال 15 يومًا', 'Inactive: 16–30 days': 'غير نشط: 16–30 يومًا', 'Inactive: 31–60 days': 'غير نشط: 31–60 يومًا', 'Inactive: over 60 days': 'غير نشط: أكثر من 60 يومًا',
      'Enabled accounts only · disabled accounts excluded': 'الحسابات المفعّلة فقط · باستثناء المعطّلة', 'Distinct users per role · automatic roles excluded': 'مستخدمون مميَّزون لكل دور · باستثناء الأدوار التلقائية',
      'New user accounts in range': 'حسابات جديدة ضمن النطاق', 'From': 'من', 'To': 'إلى', 'Apply': 'تطبيق', 'Select a valid date range.': 'اختر نطاق تاريخ صحيحًا.',
      'Security & Data Quality': 'الأمان وجودة البيانات', 'All users · not affected by filters · click to open the User Directory': 'كل المستخدمين · لا تتأثر بالمرشحات · انقر لفتح دليل المستخدمين',
      'Users without Employee links': 'مستخدمون بلا ربط بموظف', 'Users without assigned departments': 'مستخدمون بلا قسم', 'Employee mapping conflicts': 'تعارضات ربط الموظفين', 'Enabled users inactive over 30 days': 'مستخدمون مفعّلون غير نشطين لأكثر من 30 يومًا',
      'Enabled privileged users who are inactive': 'مستخدمون بصلاحيات عليا غير نشطين', 'Users with multiple privileged roles': 'مستخدمون بأكثر من دور أعلى',
      'Chart unavailable': 'الرسم غير متاح', 'No users match the selected filters.': 'لا يوجد مستخدمون يطابقون المرشحات.', 'Analytics could not be loaded. Check your connection and try again.': 'تعذّر تحميل التحليلات. تحقق من الاتصال وحاول مجددًا.',
      'Language': 'اللغة', 'Flag': 'علامة', 'Multiple privileged roles': 'أكثر من دور أعلى', 'Employee mapping conflict': 'تعارض ربط الموظف', 'Last login 16–30 days ago': 'آخر دخول قبل 16–30 يومًا', 'Last login 31–60 days ago': 'آخر دخول قبل 31–60 يومًا', 'Last login over 60 days ago': 'آخر دخول قبل أكثر من 60 يومًا'
    };
    const PAT = [
      [/^(\d{4}-\d{2}-\d{2}) – (\d{4}-\d{2}-\d{2}) · (\d+) days?$/, m => m[1] + ' – ' + m[2] + ' · ' + m[3] + ' يوم'],
      [/^Date filter: (Created between|Last login between) (\S+) – (\S+)$/, m => 'مرشح التاريخ: ' + (m[1] === 'Created between' ? 'أُنشئ بين' : 'آخر دخول بين') + ' ' + m[2] + ' – ' + m[3]],
      [/^(\d+) failed · (\d+) users$/, m => m[1] + ' فاشلة · ' + m[2] + ' مستخدم'],
      [/^Not available: Activity Log retention starts (\S+)$/, m => 'غير متوفر: يبدأ الاحتفاظ بسجل النشاط من ' + m[1]],
      [/^Enabled · login within 15 days · ([\d.]+%)$/, m => 'مفعّل · دخول خلال 15 يومًا · ' + m[1]],
      [/^Enabled · no login in 15\+ days · ([\d.]+%)$/, m => 'مفعّل · لا دخول منذ 15+ يومًا · ' + m[1]],
      [/^Account disabled · ([\d.]+%)$/, m => 'حساب معطّل · ' + m[1]],
      [/^Show all \((\d+)\)$/, m => 'عرض الكل (' + m[1] + ')'],
      [/^Live · updated (.+)$/, m => 'مباشر · آخر تحديث ' + m[1]],
      [/^(Status|Department|User type|Role|Search|Last login|Flag): (.+)$/, m => (AR[m[1]] || m[1]) + ': ' + (AR[m[2]] || m[2])],
      [/^(\d+) users?$/, m => m[1] + ' مستخدم'],
      [/^Analytics could not be loaded \(HTTP (\d+)\)\.$/, m => 'تعذّر تحميل التحليلات (HTTP ' + m[1] + ').']
    ];
    const tr = s => { const k = s.trim(); if (!k) return null; if (Object.prototype.hasOwnProperty.call(AR, k)) return AR[k]; for (const p of PAT) { const m = k.match(p[0]); if (m) return p[1](m); } return null; };
    const ORIG = new WeakMap();
    let busy = false;
    function applyNode(n){
      const p = n.parentElement; if (!p || p.closest('[data-raw]') || p.closest('script,style')) return;
      let o = ORIG.get(n);
      if (!o || (n.nodeValue !== o.en && n.nodeValue !== o.ar)) { o = { en: n.nodeValue, ar: undefined }; ORIG.set(n, o); }
      if (lang === 'ar') {
        if (o.ar === undefined) { const t = tr(o.en); o.ar = t === null ? o.en : o.en.replace(o.en.trim(), t); }
        if (n.nodeValue !== o.ar) n.nodeValue = o.ar;
      } else if (n.nodeValue !== o.en) n.nodeValue = o.en;
    }
    function applyAll(){
      busy = true;
      try {
        ui.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr'); ui.setAttribute('lang', lang);
        const w = document.createTreeWalker(ui, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) applyNode(n);
        ui.querySelectorAll('.uaa-lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === lang));
      } finally { obs.takeRecords(); busy = false; }
    }
    let pending = false;
    const obs = new MutationObserver(() => { if (busy || pending) return; pending = true; requestAnimationFrame(() => { pending = false; applyAll(); }); });
    const tools = ui.querySelector('.uad-tools');
    if (tools && !tools.querySelector('.uaa-lang')) {
      const sw = document.createElement('div'); sw.className = 'uaa-lang'; sw.setAttribute('data-raw', '');
      sw.innerHTML = '<button data-lang="en">English</button><button data-lang="ar">العربية</button>';
      tools.insertBefore(sw, tools.firstChild);
      sw.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { lang = b.dataset.lang; try { localStorage.setItem(KEY, lang); } catch (e) {} applyAll(); }));
    }
    obs.observe(ui, { childList: true, subtree: true, characterData: true });
    applyAll();
  })();

  // ---------- Selected Period (Start / End date) — added 2026-10-31 ----------
  (function periodModule(){
    const TZ = 'Asia/Riyadh';
    const iso = d => d.toISOString().slice(0, 10);
    const rToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
    function presetRange(p){
      const t = rToday(), d = new Date(t + 'T00:00:00Z');
      if (p === 'today') return { from: t, to: t };
      if (p === 'week') { const s = addDays(t, -d.getUTCDay()); return { from: s, to: addDays(s, 6) }; } // Sunday–Saturday
      if (p === 'year') return { from: t.slice(0, 4) + '-01-01', to: t.slice(0, 4) + '-12-31' };
      const first = t.slice(0, 8) + '01'; const n = new Date(first + 'T00:00:00Z'); n.setUTCMonth(n.getUTCMonth() + 1); n.setUTCDate(0);
      return { from: first, to: iso(n) };
    }
    function validate(f, t){
      if (!f || !t) return 'Both Start Date and End Date are required.';
      const re = /^\d{4}-\d{2}-\d{2}$/;
      if (!re.test(f) || !re.test(t)) return 'Dates must use the format YYYY-MM-DD.';
      const df = new Date(f + 'T00:00:00Z'), dt = new Date(t + 'T00:00:00Z');
      if (isNaN(df) || isNaN(dt) || iso(df) !== f || iso(dt) !== t) return 'Invalid calendar date.';
      if (df > dt) return 'Start Date cannot be after End Date.';
      if (f < '2000-01-01' || (dt - df) / 86400000 + 1 > 3660 || t > addDays(rToday(), 366)) return 'Unsupported date range (from 2000-01-01, maximum 10 years).';
      return null;
    }
    state.period = Object.assign({ preset: 'month' }, presetRange('month'));
    state.pSeq = 0;
    const fromEl = $('[data-role="p-from"]'), toEl = $('[data-role="p-to"]');
    function syncBar(){
      fromEl.value = state.period.from; toEl.value = state.period.to;
      $$('[data-preset]').forEach(b => { const on = b.dataset.preset === state.period.preset; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    }
    function pErr(msg){ errBox('[data-role="p-error"]', msg, () => { errBox('[data-role="p-error"]', null); loadPeriod(); }); }
    function bars(list, color, emptyMsg){
      const max = Math.max(0, ...list.map(x => x.count));
      if (!max) return '<div class="uad-empty">' + esc(emptyMsg) + '</div>';
      const every = Math.max(1, Math.ceil(list.length / 12));
      return '<div class="uad-pchart" style="--n:' + list.length + '">' + list.map((x, i) =>
        '<div class="uad-pcol" title="' + esc(x.period + ': ' + x.count) + '"><span class="v">' + (x.count ? x.count : '') + '</span>' +
        '<span class="b" style="height:' + (x.count ? Math.max(3, Math.round(x.count * 100 / max)) : 0) + '%;background:' + color + '"></span>' +
        '<span class="l">' + (i % every === 0 ? esc(x.period.length === 10 ? x.period.slice(8) : x.period.slice(5) + '/' + x.period.slice(2, 4)) : '') + '</span></div>').join('') + '</div>';
    }
    async function loadPeriod(){
      const seq = ++state.pSeq; pErr(null);
      $$('[data-pv]').forEach(e => { if (e.tagName === 'B') e.textContent = '…'; });
      ['ps-trend', 'ps-dist'].forEach(r => $('[data-role="' + r + '"]').innerHTML = '<div class="uad-skel"></div>');
      const p = { from_date: state.period.from, to_date: state.period.to };
      if (state.dept) p.department = state.dept;
      try {
        const m = await apiGet('/api/method/user_access_period', p);
        if (seq !== state.pSeq) return;
        state.pData = m;
        $('[data-role="ps-range"]').textContent = m.from_date + ' – ' + m.to_date + ' · ' + m.days + (m.days === 1 ? ' day' : ' days');
        $('[data-pv="new"]').textContent = fmt(m.new_users_created);
        $('[data-pv="ll"]').textContent = fmt(m.last_login_in_period);
        const ev = m.login_events || {};
        if (ev.available) {
          $('[data-pv="ev"]').textContent = fmt(ev.successful_logins);
          $('[data-pv="evnote"]').textContent = ev.failed_logins + ' failed · ' + ev.users_with_logins + ' users';
        } else {
          $('[data-pv="ev"]').textContent = 'Not available';
          $('[data-pv="evnote"]').textContent = ev.earliest_record ? ('Not available: Activity Log retention starts ' + ev.earliest_record) : 'No login records in Activity Log';
        }
        const g = m.granularity === 'day' ? 'Daily' : 'Monthly';
        $('[data-pv="gran1"]').textContent = g; $('[data-pv="gran2"]').textContent = g;
        $('[data-role="ps-trend"]').innerHTML = bars(m.creation_trend || [], '#1B4A7A', 'No users were created in the selected period.');
        $('[data-role="ps-dist"]').innerHTML = bars(m.last_login_distribution || [], '#1E8E5A', 'No user has a last login in the selected period.');
      } catch (e) {
        if (seq !== state.pSeq) return;
        $$('[data-pv]').forEach(x => { if (x.tagName === 'B') x.textContent = '—'; });
        ['ps-trend', 'ps-dist'].forEach(r => $('[data-role="' + r + '"]').innerHTML = '<div class="uad-empty">Period analysis could not be loaded.</div>');
        pErr(e.message || 'Period analysis could not be loaded.');
      }
    }
    function applyRange(range, preset){
      const msg = validate(range.from, range.to);
      if (msg) { pErr(msg); return false; }
      state.period = { preset: preset, from: range.from, to: range.to };
      syncBar(); loadPeriod();
      if (state.dir && state.dir.date_basis && state.dirLoaded) { state.dir.page = 1; loadDir(); }
      return true;
    }
    $$('[data-preset]').forEach(b => b.addEventListener('click', () => {
      const p = b.dataset.preset;
      if (p === 'custom') { state.period.preset = 'custom'; syncBar(); fromEl.focus(); return; }
      applyRange(presetRange(p), p);
    }));
    [fromEl, toEl].forEach(el => el.addEventListener('input', () => { state.period.preset = 'custom'; $$('[data-preset]').forEach(b => b.classList.toggle('on', b.dataset.preset === 'custom')); }));
    $('[data-role="p-apply"]').addEventListener('click', () => applyRange({ from: fromEl.value, to: toEl.value }, state.period.preset === 'custom' ? 'custom' : state.period.preset));
    $('[data-role="p-reset"]').addEventListener('click', () => applyRange(presetRange('month'), 'month'));
    $$('[data-pk]').forEach(b => b.addEventListener('click', () => openDirectory({ date_basis: b.dataset.pk })));
    $('[data-role="dept"]').addEventListener('change', () => setTimeout(loadPeriod, 0));
    syncBar(); loadPeriod();
  })();

  load();
})();
