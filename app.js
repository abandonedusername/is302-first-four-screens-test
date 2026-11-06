import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm';

const db = createClient('https://rcdgatiwfsrqkshyfmea.supabase.co', 'sb_publishable__QwH7rah3l7rmoODq3jhcg_IuNwyFRs', { db: { schema: 'raft' }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const paths = { home: ['Home', 'home'], clients: ['Client lookup', 'users'], dashboard: ['Dashboard', 'chart'], records: ['Add / edit record', 'plus'] };
const shapes = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
  chart: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 16v-4m5 4V7m5 9v-6"/>',
  plus: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8m-4-4h8"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18m-12 4h.01M12 15h.01M16 15h.01"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  search: '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 6a8 8 0 0 1 13.4 3M4.5 15A8 8 0 0 0 18 18"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  edit: '<path d="m16 3 5 5-12 12-6 1 1-6L16 3Zm-2 2 5 5"/>',
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name] || shapes.users}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x]));
const main = document.querySelector('#main');
const tables = ['person', 'client', 'appointment', 'scheduledfor', 'family', 'member_in_family', 'member_role', 'role', 'counselor', 'employee', 'room'];
const keys = ['personid', 'clientid', 'appointmentid', 'appointmentid,clientid', 'familyid', 'familyid,memberid', 'familyid,memberid,roleid', 'roleid', 'counselorid', 'employeeid', 'roomnumber'];
let data = null, loadError = '', loading = true, selectedClient = null, search = '', page = 'home', formType = 'client', formMode = 'new', recordID = '', partialID = null, existingPersonID = '', saving = false;
let lastLoaded = null;
const name = id => { const p = data?.person.find(p => p.personid === Number(id)); return p ? [p.firstname, p.lastname].filter(Boolean).join(' ') || `Person #${id}` : `Person #${id}`; };
const initials = id => name(id).split(' ').map(n => n[0]).slice(0, 2).join('');
const date = (v, options = {}) => v ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', ...options }).format(new Date(v.length === 10 ? `${v}T12:00:00` : v)) : 'Not recorded';
const time = v => v ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(v)) : 'Not recorded';
const isToday = v => v && new Date(v).toDateString() === new Date().toDateString();
const todayAppointments = () => data.appointment.filter(a => isToday(a.appointmenttime)).sort((a, b) => String(a.appointmenttime).localeCompare(String(b.appointmenttime)));
const button = (label, href, symbol = 'arrow', primary = false) => `<a class="btn${primary ? ' primary' : ''}" href="${href}">${icon(symbol)}${label}</a>`;
const heading = (eyebrow, title, sub, action = '') => `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${sub}</p></div>${action}</div>`;
const empty = (title, sub, symbol = 'calendar') => `<div class="empty"><span class="empty-symbol">${icon(symbol)}</span><strong>${title}</strong>${sub}</div>`;
const stat = (label, value, note, symbol) => `<article class="stat"><div class="stat-top">${label}<span class="stat-icon">${icon(symbol)}</span></div><div class="stat-value">${value}</div><div class="stat-note">${note}</div></article>`;

async function fetchTable(table, index) {
  const rows = [];
  for (let offset = 0; ;) {
    let query = db.from(table).select('*', { count: 'exact' });
    for (const key of keys[index].split(',')) query = query.order(key);
    const { data: batch, error, count } = await query.range(offset, offset + 499);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...batch);
    if (count != null ? rows.length >= count : batch.length < 500) return rows;
    if (!batch.length) throw new Error(`${table}: the database returned an incomplete result. Please refresh.`);
    offset += batch.length;
  }
}
async function load() {
  loading = true; loadError = ''; render();
  document.querySelector('#connection').textContent = 'Connecting';
  try {
    const results = await Promise.all(tables.map(fetchTable));
    data = Object.fromEntries(tables.map((t, i) => [t, results[i]]));
    lastLoaded = new Date();
    document.querySelector('#connection').textContent = 'Database connected';
    document.querySelector('#connection').className = 'connection';
  } catch (e) {
    loadError = e.message;
    document.querySelector('#connection').textContent = 'Connection issue';
    document.querySelector('#connection').className = 'connection error';
  }
  loading = false; render();
}

function render() {
  page = location.hash.slice(1).split('?')[0] || 'home';
  if (!paths[page]) { location.hash = 'home'; return; }
  document.title = `${paths[page][0]} · RAFT`;
  document.querySelector('#page-label').textContent = paths[page][0];
  document.querySelector('#nav').innerHTML = Object.entries(paths).map(([key, [label, symbol]]) => `<a class="nav-link ${page === key ? 'active' : ''}" href="#${key}" ${page === key ? 'aria-current="page"' : ''}>${icon(symbol)}${label}${page === key ? '<span class="nav-arrow">›</span>' : ''}</a>`).join('');
  if (loading) { main.innerHTML = '<div class="loading" role="status">Opening your workspace…</div>'; return; }
  if (loadError) { main.innerHTML = `${heading('YOUR WORKSPACE', 'Let’s reconnect.', 'Your database could not be loaded. No sample data is shown.')}<div class="error-box" role="alert">${esc(loadError)}<br>Check network access and the existing raft schema’s API permissions.</div><button class="btn primary" id="retry">${icon('refresh')}Try again</button>`; document.querySelector('#retry').onclick = load; return; }
  main.innerHTML = ({ home: homeView, clients: clientView, dashboard: dashboardView, records: recordView })[page]();
  wire();
}

function homeView() {
  const today = todayAppointments();
  return `${heading('THE FRONT DESK', 'A good day starts with care.', 'Welcome back. Here’s your practice at a glance.', button('Add a record', '#records', 'plus', true))}
  <section class="hero"><div class="hero-copy"><div class="eyebrow">A LITTLE ORGANIZATION. MORE CONNECTION.</div><h2>People first.<br>Everything else, right here.</h2><p>Find a client, plan an appointment, and keep care moving.</p>${button('Find a client', '#clients', 'search')}</div><div class="hero-art" aria-hidden="true"><svg viewBox="0 0 360 240" preserveAspectRatio="xMidYMid slice"><circle cx="255" cy="115" r="131" fill="#e1e9d2"/><circle cx="255" cy="115" r="95" fill="#d5e2c0"/><path d="M242 252c-9-51-5-99 9-151" stroke="#789363" stroke-width="2" fill="none"/><path d="M248 174c-47 0-70-28-73-54 40-3 71 18 73 54Z" fill="#a2b88b"/><path d="M249 151c-7-39 12-67 47-78 5 34-11 62-47 78Z" fill="#7e9b6e"/><path d="M242 212c-39 0-67-22-72-49 39-2 67 13 72 49Z" fill="#bbcca7"/><path d="M246 196c0-35 26-58 60-59-3 37-26 57-60 59Z" fill="#95ae7e"/><circle cx="168" cy="72" r="10" fill="#c5d4b2"/><path d="M117 220c44-19 87-22 139-7" fill="none" stroke="#b5c7a0" stroke-width="2"/><path d="m312 45 3-8 3 8 8 3-8 3-3 8-3-8-8-3Z" fill="#9ab580"/></svg></div></section>
  <section class="stats" aria-label="Practice overview">${stat('Today’s appointments', today.length, 'Scheduled for today', 'calendar')}${stat('Clients', data.client.length, 'People in our care', 'users')}${stat('Families', data.family.length, 'Connections that matter', 'heart')}${stat('Counselors', data.counselor.length, 'Supporting our community', 'users')}</section>
  <div class="content-grid"><section class="panel"><div class="panel-head"><div><h2>Today’s appointments</h2><p>${date(new Date().toISOString(), { weekday: 'long' })}</p></div><a class="text-link" href="#records">Manage ${icon('arrow')}</a></div>${today.length ? appointmentTable(today, true) : empty('A little breathing room.', 'There are no appointments scheduled for today.')}<div class="mini-summary">${data.appointment.length} appointments in the database · <a class="text-link" href="#dashboard">See the bigger picture →</a></div></section>
  <div><section class="panel"><div class="panel-head"><h2>Where would you like to go?</h2></div>${quick('Client lookup', 'Contact details, appointments & families', '#clients', 'search')}${quick('Practice dashboard', 'A clear view of how RAFT is doing', '#dashboard', 'chart')}${quick('Add or edit a record', 'Keep client and appointment details current', '#records', 'plus')}</section><div class="gentle-note">${icon('heart')}<div><strong>Behind every record is a person.</strong><br>Thank you for making their day a little easier.</div></div></div></div>
  <div class="status-line">Live from your RAFT database · Last refreshed ${time(lastLoaded.toISOString())} <button class="text-link" data-refresh>Refresh</button></div>`;
}
function quick(title, sub, href, symbol) { return `<a class="quick-link" href="${href}"><span class="quick-icon">${icon(symbol)}</span><div><strong>${title}</strong><p>${sub}</p></div><span>↗</span></a>`; }

function appointmentTable(appointments, home = false, clientID = null) {
  if (!appointments.length) return empty('No appointments on record.', 'Appointments linked to this client will appear here.');
  return `<div class="table-scroll"><table><thead><tr><th>${home ? 'Time / client' : 'Date & time'}</th><th>Counselor</th><th>${clientID ? 'Attendance' : 'Room'}</th><th></th></tr></thead><tbody>${appointments.map(a => {
    const counselor = `${name(a.counselorid)}`;
    const sf = clientID ? data.scheduledfor.find(s => s.appointmentid === a.appointmentid && s.clientid === clientID) : null;
    const clients = data.scheduledfor.filter(s => s.appointmentid === a.appointmentid).map(s => name(s.clientid)).join(', ');
    return `<tr><td><strong>${home ? time(a.appointmenttime) : date(a.appointmenttime)}</strong><small>${home ? esc(clients || 'No linked clients') : time(a.appointmenttime)} · ${a.duration == null ? 'Duration not recorded' : `${a.duration} min`}</small>${sf?.assignment ? `<small>Assignment: ${esc(sf.assignment)}</small>` : ''}</td><td>${esc(counselor)}<small>${esc(data.counselor.find(c => c.counselorid === a.counselorid)?.degreesuffix || '')}</small></td><td>${clientID ? `<span class="badge ${sf?.kept == null ? 'gray' : sf.kept ? '' : 'amber'}">${sf?.kept == null ? 'Not recorded' : sf.kept ? 'Kept' : 'Not kept'}</span>` : esc(data.room.find(r => r.roomnumber === a.roomnumber)?.roomname || `Room ${a.roomnumber}`)}</td><td><button class="table-btn" data-edit-appointment="${a.appointmentid}" aria-label="Edit appointment ${a.appointmentid}">${icon('edit')}</button></td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function filteredClients() {
  const q = search.trim().toLowerCase();
  return data.client.filter(c => { const p = data.person.find(p => p.personid === c.clientid); return [name(c.clientid), c.clientid, p?.email, p?.phone].some(v => String(v ?? '').toLowerCase().includes(q)); }).sort((a, b) => name(a.clientid).localeCompare(name(b.clientid)));
}
function clientItems() { const list = filteredClients(); return list.length ? list.map(c => `<button class="client-item ${selectedClient === c.clientid ? 'selected' : ''}" data-client="${c.clientid}" aria-pressed="${selectedClient === c.clientid}"><span class="avatar">${esc(initials(c.clientid))}</span><span><strong>${esc(name(c.clientid))}</strong><small>Client #${c.clientid}</small></span><span class="nav-arrow">›</span></button>`).join('') : empty('No matching clients.', 'Try another name, email, phone, or ID.', 'search'); }
function clientView() {
  if (selectedClient == null && data.client.length) selectedClient = [...data.client].sort((a,b) => name(a.clientid).localeCompare(name(b.clientid)))[0].clientid;
  return `${heading('PEOPLE & CONNECTIONS', 'A familiar face. The full picture.', 'Find the details you need to make every interaction feel personal.', button('Add client', '#records', 'plus', true))}<div class="toolbar"><div class="search-wrap">${icon('search')}<label class="sr-only" for="client-search">Search clients</label><input id="client-search" type="search" placeholder="Search by name, email, phone, or client ID" value="${esc(search)}" autocomplete="off"></div><button class="btn" data-refresh aria-label="Refresh clients">${icon('refresh')}</button></div><div class="lookup-grid"><section class="panel"><div class="panel-head"><h2>Clients</h2><span id="client-count" class="badge gray">${filteredClients().length}</span></div><div id="client-list" class="client-list">${clientItems()}</div></section><div id="client-detail">${clientDetail()}</div></div>`;
}
function clientDetail() {
  const c = data.client.find(c => c.clientid === selectedClient);
  if (!c) return `<section class="panel">${empty('Select a client.', 'Their information will appear here.', 'users')}</section>`;
  const p = data.person.find(p => p.personid === c.clientid) || {};
  const memberships = data.member_in_family.filter(m => m.memberid === c.clientid);
  const ids = new Set(data.scheduledfor.filter(s => s.clientid === c.clientid).map(s => s.appointmentid));
  const appointments = data.appointment.filter(a => ids.has(a.appointmentid)).sort((a,b) => String(b.appointmenttime).localeCompare(String(a.appointmenttime)));
  const address = [p.address, [p.city, p.state, p.zip?.trim()].filter(Boolean).join(', ')].filter(Boolean).join('<br>');
  return `<section class="panel"><div class="detail-top"><span class="avatar">${esc(initials(c.clientid))}</span><div><h2>${esc(name(c.clientid))}</h2><p>Client #${c.clientid}</p></div><button class="btn" data-edit-client="${c.clientid}">${icon('edit')}Edit client</button></div><section class="detail-section"><h3>Contact & client information</h3><dl class="contact-grid"><div><dt>Email address</dt><dd>${p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : 'Not recorded'}</dd></div><div><dt>Phone number</dt><dd>${p.phone ? `<a href="tel:${esc(p.phone)}">${esc(p.phone)}</a>` : 'Not recorded'}</dd></div><div><dt>Address</dt><dd>${address ? [p.address, [p.city, p.state, p.zip?.trim()].filter(Boolean).join(', ')].filter(Boolean).map(esc).join('<br>') : 'Not recorded'}</dd></div><div><dt>Reminder method</dt><dd>${esc(c.remindermethod || 'Not recorded')}</dd></div><div><dt>How they found RAFT</dt><dd>${esc(c.foundout || 'Not recorded')}</dd></div><div><dt>Referred by</dt><dd>${c.referredby ? esc(name(c.referredby)) : 'Not recorded'}</dd></div></dl></section><section class="detail-section"><h3>Families & roles <span class="badge gray">${memberships.length}</span></h3>${memberships.length ? memberships.map(m => { const family = data.family.find(f => f.familyid === m.familyid); const roles = data.member_role.filter(r => r.memberid === c.clientid && r.familyid === m.familyid).map(r => data.role.find(role => role.roleid === r.roleid)?.rolename || `Role #${r.roleid}`); return `<div class="family-row"><div><strong>${esc(family?.familyname || `Family #${m.familyid}`)}</strong><small>Joined ${date(m.datejoined)}</small></div><div>${roles.length ? roles.map(r => `<span class="badge">${esc(r)}</span>`).join('') : '<span class="badge gray">No roles recorded</span>'}</div></div>`; }).join('') : '<p class="form-hint">No family memberships recorded for this client.</p>'}</section><div class="panel-head"><h2>Appointments <span class="badge gray">${appointments.length}</span></h2></div>${appointmentTable(appointments, false, c.clientid)}</section>`;
}

function bars(rows, label, count) {
  const max = Math.max(1, ...rows.map(count));
  return rows.length ? `<div class="bar-list">${rows.map(row => `<div class="bar-row"><div class="bar-label"><span>${esc(label(row))}</span><strong>${count(row)}</strong></div><div class="bar-track"><div class="bar-fill" style="width:${count(row)/max*100}%"></div></div></div>`).join('')}</div>` : empty('No records yet.', 'Statistics will appear when records are available.', 'chart');
}
function dashboardView() {
  const recorded = data.scheduledfor.filter(s => s.kept != null), kept = recorded.filter(s => s.kept).length;
  const referrals = Object.entries(data.client.reduce((out, c) => { const key = c.foundout || 'Not recorded'; out[key] = (out[key] || 0) + 1; return out; }, {})).sort((a,b) => b[1]-a[1]);
  const duration = data.appointment.reduce((n,a) => n + (a.duration || 0), 0);
  return `${heading('THE BIGGER PICTURE', 'Small connections. Meaningful impact.', 'A live snapshot, calculated from all records in your RAFT database.', '<button class="btn" data-refresh>'+icon('refresh')+'Refresh data</button>')}<section class="stats">${stat('Total clients', data.client.length, `${data.person.length} people across all roles`, 'users')}${stat('Appointments', data.appointment.length, `${todayAppointments().length} scheduled today`, 'calendar')}${stat('Families', data.family.length, `${data.member_in_family.length} family memberships`, 'heart')}${stat('Attendance rate', recorded.length ? `${Math.round(kept/recorded.length*100)}%` : '—', recorded.length ? `${kept} kept of ${recorded.length} recorded client visits` : 'No attendance recorded', 'check')}</section><div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Appointments by counselor</h2><p>All recorded appointments, across all dates</p></div>${icon('calendar')}</div>${bars(data.counselor, c => name(c.counselorid), c => data.appointment.filter(a => a.counselorid === c.counselorid).length)}<div class="metric-detail">${data.counselor.length} counselors · ${data.room.length} rooms · ${data.employee.length} employees<br>${duration} total scheduled minutes (${(duration/60).toFixed(1)} hours)</div></section><section class="panel"><div class="panel-head"><div><h2>How clients found RAFT</h2><p>Referral sources from client records</p></div>${icon('users')}</div>${bars(referrals, r => r[0], r => r[1])}<div class="metric-detail">Attendance is counted per client–appointment link. Unrecorded attendance is excluded from the rate.</div></section></div><section class="panel" style="margin-top:24px"><div class="panel-head"><div><h2>Appointment history</h2><p>All appointments, most recent first</p></div><span class="badge gray">${data.appointment.length} total</span></div>${appointmentTable([...data.appointment].sort((a,b)=>String(b.appointmenttime).localeCompare(String(a.appointmenttime))))}</section><div class="status-line">Last refreshed ${time(lastLoaded.toISOString())} · All-time statistics</div>`;
}

const option = (value, label, selected) => `<option value="${esc(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${esc(label)}</option>`;
const input = (label, key, value = '', type = 'text', max = '', required = false, extra = '') => `<div ${extra}><label for="${key}">${label}${required ? ' <span aria-hidden="true">*</span>' : ''}</label><input id="${key}" name="${key}" type="${type}" value="${esc(value)}" ${max ? `maxlength="${max}"` : ''} ${required ? 'required' : ''} ${type === 'datetime-local' ? 'step="1"' : ''}></div>`;
const select = (label, key, options, required = false, hint = '') => `<div><label for="${key}">${label}${required ? ' *' : ''}</label><select id="${key}" name="${key}" ${required ? 'required' : ''}>${options}</select>${hint ? `<p class="form-hint">${hint}</p>` : ''}</div>`;
function recordView() {
  const isClient = formType === 'client';
  const existing = isClient ? data.client : data.appointment;
  const choices = existing.map(r => option(isClient ? r.clientid : r.appointmentid, isClient ? `${name(r.clientid)} · #${r.clientid}` : `#${r.appointmentid} · ${date(r.appointmenttime)} · ${time(r.appointmenttime)}`, recordID)).join('');
  return `${heading('KEEP CARE MOVING', 'The right details make a difference.', 'Add a new record or update an existing one. Changes save directly to RAFT.')}<section class="panel form-shell"><div class="form-tabs" role="tablist" aria-label="Record type"><button class="form-tab ${isClient ? 'active' : ''}" role="tab" aria-selected="${isClient}" data-form-type="client">${icon('users')} &nbsp; Client</button><button class="form-tab ${!isClient ? 'active' : ''}" role="tab" aria-selected="${!isClient}" data-form-type="appointment">${icon('calendar')} &nbsp; Appointment</button></div><form id="record-form"><div class="form-body"><div id="form-feedback" role="status" aria-live="polite"></div><div class="form-controls">${select('What would you like to do?', 'form-mode', option('new', 'Add a new record', formMode) + option('edit', 'Edit an existing record', formMode))}${formMode === 'edit' ? select(`Choose ${isClient ? 'a client' : 'an appointment'}`, 'record-id', option('', 'Select a record…', recordID) + choices, true) : '<div class="form-hint" style="align-self:center">Record IDs are assigned by the database.<br>Fields marked * are required by this form.</div>'}</div><div id="record-fields">${formMode === 'new' || recordID ? (isClient ? clientFields() : appointmentFields()) : empty('Choose a record to get started.', 'Its existing details will load into the form.', 'edit')}</div></div><div class="form-actions"><p>No changes are saved until you select Save.</p><div><button class="btn" type="button" id="reset-form">Reset</button><button class="btn primary" id="save-button" type="submit" ${formMode === 'edit' && !recordID ? 'disabled' : ''}>${icon('check')}Save ${isClient ? 'client' : 'appointment'}</button></div></div></form></section><div class="status-line">Stored only in your existing raft schema · No local data storage</div>`;
}
function clientFields() {
  const c = data.client.find(c => c.clientid === Number(recordID)) || {};
  const p = data.person.find(p => p.personid === Number(formMode === 'edit' ? recordID : existingPersonID)) || {};
  const v = key => formMode === 'edit' ? c[key] : '';
  return `${formMode === 'new' ? `<div style="margin-bottom:26px">${select('Person record', 'existing-person', option('', 'Create a new person', existingPersonID) + data.person.filter(p => !data.client.some(c => c.clientid === p.personid)).map(p => option(p.personid, `${name(p.personid)} - Person #${p.personid}`, existingPersonID)).join(''), false, 'Choose an existing person to add a client role without duplicating their contact record.')}</div>` : ''}<h2 class="form-subheading">Personal & contact information</h2><div class="form-grid">${input('First name','firstname',p.firstname,'text',50,true)}${input('Last name','lastname',p.lastname,'text',50,true)}${input('Email address','email',p.email,'email',100)}${input('Phone number','phone',p.phone,'tel',14)}${input('Street address','address',p.address,'text',50,false,'class="full"')}<div class="full thirds">${input('City','city',p.city,'text',50)}${input('State','state',p.state,'text',2)}${input('ZIP code','zip',p.zip?.trim(),'text',10)}</div></div><h2 class="form-subheading" style="margin-top:30px">Client details</h2><div class="form-grid">${input('How they found RAFT','foundout',v('foundout'),'text',50)}${input('Reminder method','remindermethod',v('remindermethod'),'text',50)}${select('Referred by (optional)','referredby',option('', 'No referral recorded', v('referredby')) + data.client.map(r=>option(r.clientid,name(r.clientid),v('referredby'))).join(''))}</div><p class="form-hint">Contact information is stored once, in Person. Editing it also updates the contact details used by this person’s other roles. This form does not change family memberships or roles.</p>`;
}
function appointmentFields() {
  const a = formMode === 'edit' ? data.appointment.find(a => a.appointmentid === Number(recordID)) || {} : {};
  const linked = data.scheduledfor.filter(s=>s.appointmentid === a.appointmentid);
  return `<h2 class="form-subheading">Appointment details</h2><div class="form-grid">${input('Date & time','appointmenttime',a.appointmenttime?.slice(0,19),'datetime-local','',true)}<div><label for="duration">Duration (minutes) *</label><input id="duration" name="duration" type="number" min="1" max="2147483647" step="1" value="${esc(a.duration)}" required></div>${select('Counselor','counselorid',option('', 'Select a counselor…', '') + data.counselor.map(c=>option(c.counselorid,`${name(c.counselorid)}${c.degreesuffix ? ', '+c.degreesuffix : ''}`,a.counselorid)).join(''),true)}${select('Recorded by (employee)','employeeid',option('', 'Select an employee…', '') + data.employee.map(e=>option(e.employeeid,name(e.employeeid),a.employeeid)).join(''),true)}${select('Room','roomnumber',option('', 'Select a room…', '') + data.room.map(r=>option(r.roomnumber,r.roomname || `Room ${r.roomnumber}`,a.roomnumber)).join(''),true)}<div class="full"><label for="notes">Notes</label><textarea name="notes" id="notes" maxlength="3000" placeholder="Additional appointment information…">${esc(a.notes)}</textarea><p class="form-hint">Up to 3,000 characters. Date and time are saved as entered, without a time zone.</p></div><div class="full"><label>${formMode === 'new' ? 'Clients for this appointment (optional)' : 'Linked clients'}</label>${formMode === 'new' ? `<div class="checklist">${data.client.length ? data.client.map(c=>`<label><input type="checkbox" name="clientids" value="${c.clientid}">${esc(name(c.clientid))}</label>`).join('') : '<span class="form-hint">No clients are available.</span>'}</div><p class="form-hint">Selected clients are linked through ScheduledFor. Attendance and assignments are left unrecorded.</p>` : `<div>${linked.length ? linked.map(s=>`<span class="badge">${esc(name(s.clientid))}</span>`).join('') : '<span class="form-hint">No linked clients.</span>'}</div><p class="form-hint">Saving updates the appointment only; existing client links, assignments, and attendance remain unchanged.</p>`}</div></div>`;
}

function editRecord(type, id) { formType = type; formMode = 'edit'; recordID = String(id); partialID = null; if (page !== 'records') location.hash = 'records'; else render(); }
function wire() {
  document.querySelectorAll('[data-refresh]').forEach(b => b.onclick = load);
  document.querySelectorAll('[data-edit-client]').forEach(b => b.onclick = () => editRecord('client', b.dataset.editClient));
  document.querySelectorAll('[data-edit-appointment]').forEach(b => b.onclick = () => editRecord('appointment', b.dataset.editAppointment));
  wireClients();
  const searchInput = document.querySelector('#client-search');
  if (searchInput) searchInput.oninput = e => { search = e.target.value; document.querySelector('#client-list').innerHTML = clientItems(); document.querySelector('#client-count').textContent = filteredClients().length; wireClients(); };
  document.querySelectorAll('[data-form-type]').forEach(b => b.onclick = () => { if (saving) return; formType = b.dataset.formType; recordID = ''; partialID = null; existingPersonID = ''; render(); });
  const mode = document.querySelector('#form-mode');
  if (mode) mode.onchange = () => { formMode = mode.value; recordID = ''; partialID = null; existingPersonID = ''; render(); };
  const choice = document.querySelector('#record-id');
  if (choice) choice.onchange = () => { recordID = choice.value; partialID = null; render(); };
  const reset = document.querySelector('#reset-form');
  if (reset) reset.onclick = () => { partialID = null; existingPersonID = ''; render(); };
  const existing = document.querySelector('#existing-person');
  if (existing) existing.onchange = () => { existingPersonID = existing.value; partialID = null; render(); };
  const form = document.querySelector('#record-form');
  if (form) form.onsubmit = saveRecord;
}
function wireClients() {
  document.querySelectorAll('[data-client]').forEach(b => b.onclick = () => { selectedClient = Number(b.dataset.client); document.querySelector('#client-list').innerHTML = clientItems(); document.querySelector('#client-detail').innerHTML = clientDetail(); wire(); });
}
function toast(message) { const el = document.querySelector('#toast'); el.textContent = message; el.style.display = 'block'; setTimeout(()=>el.style.display='none',5000); }
async function write(query, label) { const result = await query; if (result.error) throw new Error(`${label}: ${result.error.message}`); return result.data; }
async function saveRecord(event) {
  event.preventDefault(); if (saving) return;
  const form = event.currentTarget, fields = new FormData(form), feedback = document.querySelector('#form-feedback');
  const get = key => String(fields.get(key) || '').trim() || null;
  saving = true;
  form.querySelectorAll('button,input,select,textarea').forEach(e=>e.disabled=true);
  feedback.innerHTML = '';
  let step = '';
  try {
    let id = formMode === 'edit' ? Number(recordID) : partialID || (formType === 'client' && existingPersonID ? Number(existingPersonID) : null);
    if (formType === 'client') {
      const person = Object.fromEntries(['firstname','lastname','address','city','state','zip','phone','email'].map(k=>[k,get(k)]));
      if (person.state) { if (!/^[A-Za-z]{2}$/.test(person.state)) throw new Error('State must be a two-letter abbreviation.'); person.state = person.state.toUpperCase(); }
      if (id) { const rows = await write(db.from('person').update(person).eq('personid',id).select('personid'), 'Saving contact information'); if (rows.length !== 1) throw new Error('Contact update was not confirmed. Check the existing database permissions.'); }
      else { const row = await write(db.from('person').insert(person).select('personid').single(), 'Creating person'); id = row.personid; partialID = id; }
      step = `Person #${id} contact information was saved. `;
      const client = { foundout:get('foundout'), remindermethod:get('remindermethod'), referredby:get('referredby') ? Number(get('referredby')) : null };
      if (formMode === 'edit') { const rows = await write(db.from('client').update(client).eq('clientid',id).select('clientid'),'Saving client details'); if (rows.length !== 1) throw new Error('Client update was not confirmed. Check the existing database permissions.'); }
      else await write(db.from('client').insert({ ...client, clientid:id }).select('clientid').single(), 'Creating client');
      selectedClient = id;
    } else {
      const appointment = { appointmenttime:get('appointmenttime'), duration:Number(get('duration')), counselorid:Number(get('counselorid')), employeeid:Number(get('employeeid')), roomnumber:Number(get('roomnumber')), notes:get('notes') };
      if (!Number.isInteger(appointment.duration) || appointment.duration <= 0) throw new Error('Enter a positive whole number of minutes.');
      if (id) { const rows = await write(db.from('appointment').update(appointment).eq('appointmentid',id).select('appointmentid'), 'Saving appointment'); if (rows.length !== 1) throw new Error('Appointment update was not confirmed. Check the existing database permissions.'); }
      else { const row = await write(db.from('appointment').insert(appointment).select('appointmentid').single(), 'Creating appointment'); id = row.appointmentid; partialID = id; }
      step = `Appointment #${id} was saved. `;
      if (formMode === 'new') {
        const clientIDs = fields.getAll('clientids').map(Number);
        if (clientIDs.length) {
          const current = await write(db.from('scheduledfor').select('clientid').eq('appointmentid',id), 'Checking client links');
          const missing = clientIDs.filter(c => !current.some(r=>r.clientid===c)).map(c=>({appointmentid:id, clientid:c}));
          if (missing.length) await write(db.from('scheduledfor').insert(missing).select(), 'Linking clients');
        }
      }
    }
    partialID = null; existingPersonID = ''; recordID = ''; formMode = 'new';
    toast(`${formType === 'client' ? 'Client' : 'Appointment'} #${id} saved to RAFT.`);
    await load();
  } catch (e) {
    feedback.innerHTML = `<div class="error-box" role="alert">${esc(step + e.message)}${partialID ? `<br>The created record ID is #${partialID}. Retry Save in this form to finish without creating another ${formType === 'client' ? 'Person' : 'Appointment'} row. Resetting or leaving the form abandons this retry.` : ''}</div>`;
    feedback.scrollIntoView({behavior:'smooth',block:'center'});
    form.querySelectorAll('button,input,select,textarea').forEach(e=>e.disabled=false);
  } finally { saving = false; }
}

document.querySelector('#top-date').textContent = date(new Date().toISOString(), { weekday: 'short' });
window.addEventListener('hashchange', () => { if (saving) return; partialID = null; render(); window.scrollTo(0,0); });
load();
