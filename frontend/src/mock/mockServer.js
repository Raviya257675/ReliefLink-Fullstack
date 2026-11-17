// In-memory fake backend for DEMO MODE. Data resets on page refresh (except the login).
// It also documents the API contract the real backend must follow.
import { socket } from '../socket.js';

const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
let seq = 100;
const nid = () => ++seq;

const users = [
  { id: 1, name: 'Admin Perera', email: 'admin@demo.lk', role: 'admin', phone: '0112345678', skills: '', availability: true },
  { id: 2, name: 'Nimal Silva', email: 'volunteer@demo.lk', role: 'volunteer', phone: '0771234567', skills: 'first aid, driving', availability: true },
  { id: 3, name: 'Kamala Fernando', email: 'citizen@demo.lk', role: 'citizen', phone: '0719876543', skills: '', availability: true },
  { id: 4, name: 'Saman Kumara', email: 'saman@demo.lk', role: 'volunteer', phone: '0765550101', skills: 'logistics, boats', availability: true },
  { id: 5, name: 'Dilini Jayawardena', email: 'dilini@demo.lk', role: 'volunteer', phone: '0701112233', skills: 'nursing', availability: false },
];

let incidents = [
  { id: 1, title: 'River overflowing into homes', type: 'flood', severity: 'critical', status: 'in_progress', description: 'Kelani river has crossed the bank. About 40 families need evacuation.', address: 'Kaduwela, Colombo', lat: 6.9366, lng: 79.9886, reporter_name: 'Kamala Fernando', created_at: ago(35) },
  { id: 2, title: 'Landslide blocking main road', type: 'landslide', severity: 'high', status: 'verified', description: 'Road to Hatton blocked, vehicles stranded.', address: 'Hatton–Nuwara Eliya road', lat: 6.8905, lng: 80.5958, reporter_name: 'Nimal Silva', created_at: ago(120) },
  { id: 3, title: 'Houses damaged by strong winds', type: 'cyclone', severity: 'medium', status: 'reported', description: 'Roofs blown off in several houses.', address: 'Hambantota town', lat: 6.1241, lng: 81.1185, reporter_name: 'Kamala Fernando', created_at: ago(300) },
  { id: 4, title: 'Elderly resident needs medical help', type: 'medical', severity: 'high', status: 'reported', description: 'Cut off by flood water, needs insulin.', address: 'Ratnapura town', lat: 6.6828, lng: 80.3992, reporter_name: 'Saman Kumara', created_at: ago(15) },
  { id: 5, title: 'Forest fire near village', type: 'fire', severity: 'low', status: 'resolved', description: 'Fire brought under control by locals.', address: 'Ella, Badulla', lat: 6.8667, lng: 81.0466, reporter_name: 'Admin Perera', created_at: ago(1500) },
  { id: 6, title: 'Low-lying area flooding', type: 'flood', severity: 'medium', status: 'verified', description: 'Water level rising in paddy fields and roads.', address: 'Galle, Southern Province', lat: 6.0535, lng: 80.221, reporter_name: 'Kamala Fernando', created_at: ago(2000) },
  { id: 7, title: 'Drought: wells running dry', type: 'drought', severity: 'medium', status: 'in_progress', description: 'Water bowser needed for 3 villages.', address: 'Anuradhapura', lat: 8.3114, lng: 80.4037, reporter_name: 'Nimal Silva', created_at: ago(4000) },
  { id: 8, title: 'Minor tremor, cracked walls', type: 'earthquake', severity: 'low', status: 'resolved', description: 'Checked by engineers, no danger.', address: 'Jaffna', lat: 9.6615, lng: 80.0255, reporter_name: 'Admin Perera', created_at: ago(5200) },
];

let shelters = [
  { id: 1, name: 'Kaduwela Community Hall', address: 'Kaduwela, Colombo', lat: 6.9335, lng: 79.9842, capacity: 150, occupancy: 128, status: 'open', contact: '0112 345 111', supplies: 'food, water, blankets', updated_at: ago(10) },
  { id: 2, name: 'Ratnapura Central College', address: 'Ratnapura town', lat: 6.6805, lng: 80.4037, capacity: 200, occupancy: 200, status: 'full', contact: '0452 222 333', supplies: 'food, medicine', updated_at: ago(45) },
  { id: 3, name: 'Galle Temple Shelter', address: 'Galle Fort area', lat: 6.0269, lng: 80.217, capacity: 80, occupancy: 22, status: 'open', contact: '0912 234 567', supplies: 'water, mats', updated_at: ago(90) },
  { id: 4, name: 'Hatton Town Hall', address: 'Hatton', lat: 6.8916, lng: 80.5951, capacity: 100, occupancy: 35, status: 'open', contact: '0512 222 444', supplies: 'blankets, tea, food', updated_at: ago(200) },
  { id: 5, name: 'Jaffna Public Library Hall', address: 'Jaffna', lat: 9.6615, lng: 80.0255, capacity: 60, occupancy: 0, status: 'closed', contact: '', supplies: '', updated_at: ago(3000) },
];

let tasks = [
  { id: 1, title: 'Deliver drinking water to Kaduwela hall', description: 'Take 200 bottles from the Colombo depot.', required_skill: 'driving', status: 'open', incident_id: 1, incident_title: 'River overflowing into homes', assigned_to: null, assignee_name: null, created_at: ago(30) },
  { id: 2, title: 'First-aid check for evacuated families', description: 'Check for injuries and chronic illness.', required_skill: 'first aid', status: 'assigned', incident_id: 1, incident_title: 'River overflowing into homes', assigned_to: 2, assignee_name: 'Nimal Silva', created_at: ago(28) },
  { id: 3, title: 'Clear debris from access road', description: 'Help the local council clear small debris.', required_skill: '', status: 'in_progress', incident_id: 2, incident_title: 'Landslide blocking main road', assigned_to: 4, assignee_name: 'Saman Kumara', created_at: ago(100) },
  { id: 4, title: 'Deliver insulin to resident', description: 'Pharmacy has the medicine ready. Boat access only.', required_skill: 'boats', status: 'open', incident_id: 4, incident_title: 'Elderly resident needs medical help', assigned_to: null, assignee_name: null, created_at: ago(12) },
  { id: 5, title: 'Pack food parcels', description: '', required_skill: 'logistics', status: 'completed', incident_id: 7, incident_title: 'Drought: wells running dry', assigned_to: 2, assignee_name: 'Nimal Silva', created_at: ago(3000) },
  { id: 6, title: 'Register new shelter arrivals', description: 'Keep a headcount at the door.', required_skill: '', status: 'completed', incident_id: 6, incident_title: 'Low-lying area flooding', assigned_to: 2, assignee_name: 'Nimal Silva', created_at: ago(2500) },
];

let alerts = [
  { id: 1, message: 'Heavy rain expected tonight. Avoid low-lying areas near the Kelani river.', level: 'warning', created_at: ago(40) },
  { id: 2, message: 'Hatton–Nuwara Eliya road closed due to landslide. Use the alternate route.', level: 'info', created_at: ago(110) },
];

const fail = (status, message) => { const e = new Error(message); e.status = status; return e; };
const delay = (v) => new Promise((r) => setTimeout(() => r(v), 150));
const clone = (v) => JSON.parse(JSON.stringify(v));
const emit = (e, p) => setTimeout(() => socket.emit(e, clone(p)), 50);
const pub = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone, skills: u.skills, availability: u.availability });
const tokenToUser = (t) => (t && t.startsWith('demo-') ? users.find((u) => u.id === Number(t.slice(5))) : null);

const volunteerRows = () => users.filter((u) => u.role === 'volunteer').map((v) => ({
  ...pub(v),
  active_tasks: tasks.filter((t) => t.assigned_to === v.id && ['assigned', 'in_progress'].includes(t.status)).length,
  completed_tasks: tasks.filter((t) => t.assigned_to === v.id && t.status === 'completed').length,
}));

const stats = () => ({
  incidents: { active: incidents.filter((i) => i.status !== 'resolved').length, critical: incidents.filter((i) => i.severity === 'critical' && i.status !== 'resolved').length, total: incidents.length },
  shelters: { sheltered: shelters.filter((s) => s.status !== 'closed').reduce((a, s) => a + s.occupancy, 0), capacity: shelters.filter((s) => s.status !== 'closed').reduce((a, s) => a + s.capacity, 0) },
  volunteers: { total: users.filter((u) => u.role === 'volunteer').length, available: users.filter((u) => u.role === 'volunteer' && u.availability).length },
  tasks: { open: tasks.filter((t) => t.status === 'open').length, completed: tasks.filter((t) => t.status === 'completed').length },
});

function shelterStatus(s) { if (s.status === 'closed') return 'closed'; return s.occupancy >= s.capacity ? 'full' : 'open'; }

export async function mockRequest(method, fullPath, body = {}, token) {
  const [path, qs = ''] = fullPath.split('?');
  const q = new URLSearchParams(qs);
  const me = tokenToUser(token);
  const need = (...roles) => { if (!me) throw fail(401, 'Please sign in first.'); if (roles.length && !roles.includes(me.role)) throw fail(403, 'You do not have permission to do that.'); };
  let m;

  // ---- auth
  if (method === 'POST' && path === '/auth/login') {
    const u = users.find((x) => x.email.toLowerCase() === String(body.email).toLowerCase());
    if (!u || !body.password) throw fail(401, 'Invalid email or password. (Demo: use one of the demo buttons.)');
    return delay({ token: `demo-${u.id}`, user: pub(u) });
  }
  if (method === 'POST' && path === '/auth/register') {
    if (users.some((x) => x.email.toLowerCase() === String(body.email).toLowerCase())) throw fail(409, 'That email is already registered.');
    const u = { id: nid(), name: body.name, email: body.email, role: body.role === 'volunteer' ? 'volunteer' : 'citizen', phone: body.phone || '', skills: body.skills || '', availability: true };
    users.push(u);
    return delay({ token: `demo-${u.id}`, user: pub(u) });
  }
  if (path === '/auth/me') {
    need();
    if (method === 'GET') return delay({ user: pub(me) });
    if (method === 'PATCH') { Object.assign(me, { name: body.name, phone: body.phone, skills: body.skills, availability: body.availability ?? me.availability }); return delay({ user: pub(me) }); }
  }

  // ---- stats / volunteers
  if (method === 'GET' && path === '/stats') return delay(stats());
  if (method === 'GET' && path === '/users/volunteers') { need('admin'); return delay({ volunteers: volunteerRows() }); }

  // ---- incidents
  if (path === '/incidents' && method === 'GET') {
    let rows = incidents.filter((i) => ['status', 'type', 'severity'].every((k) => !q.get(k) || i[k] === q.get(k)));
    rows = [...rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return delay({ incidents: clone(rows) });
  }
  if (path === '/incidents' && method === 'POST') {
    need();
    const i = { id: nid(), title: body.title, type: body.type, severity: body.severity, status: 'reported', description: body.description || '', address: body.address || '', lat: body.lat, lng: body.lng, reporter_name: me.name, created_at: new Date().toISOString() };
    incidents.unshift(i); emit('incident:new', i);
    return delay({ incident: i });
  }
  if ((m = path.match(/^\/incidents\/(\d+)\/status$/)) && method === 'PATCH') {
    need('admin');
    const i = incidents.find((x) => x.id === +m[1]); if (!i) throw fail(404, 'Incident not found.');
    i.status = body.status; emit('incident:update', i);
    return delay({ incident: clone(i) });
  }
  if ((m = path.match(/^\/incidents\/(\d+)$/)) && method === 'DELETE') {
    need('admin');
    incidents = incidents.filter((x) => x.id !== +m[1]); tasks = tasks.filter((t) => t.incident_id !== +m[1]);
    emit('incident:delete', { id: +m[1] }); emit('task:changed', {});
    return delay({ ok: true });
  }

  // ---- shelters
  if (path === '/shelters' && method === 'GET') return delay({ shelters: clone(shelters) });
  if (path === '/shelters' && method === 'POST') {
    need('admin');
    const s = { id: nid(), name: body.name, address: body.address || '', lat: body.lat, lng: body.lng, capacity: body.capacity, occupancy: body.occupancy, contact: body.contact || '', supplies: body.supplies || '', status: 'open', updated_at: new Date().toISOString() };
    s.status = shelterStatus(s); shelters.unshift(s); emit('shelter:update', s);
    return delay({ shelter: s });
  }
  if ((m = path.match(/^\/shelters\/(\d+)$/))) {
    need('admin');
    const s = shelters.find((x) => x.id === +m[1]); if (!s) throw fail(404, 'Shelter not found.');
    if (method === 'PATCH') {
      if (body.occupancy !== undefined) { if (body.occupancy > s.capacity) throw fail(400, 'Occupancy cannot be above capacity.'); s.occupancy = body.occupancy; if (s.status !== 'closed') s.status = shelterStatus(s); }
      if (body.status !== undefined) s.status = body.status === 'closed' ? 'closed' : shelterStatus(s);
      s.updated_at = new Date().toISOString(); emit('shelter:update', s);
      return delay({ shelter: clone(s) });
    }
    if (method === 'DELETE') { shelters = shelters.filter((x) => x.id !== s.id); emit('shelter:update', { id: s.id, deleted: true }); return delay({ ok: true }); }
  }

  // ---- alerts
  if (path === '/alerts' && method === 'GET') return delay({ alerts: clone([...alerts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))) });
  if (path === '/alerts' && method === 'POST') {
    need('admin');
    const a = { id: nid(), message: body.message, level: body.level, created_at: new Date().toISOString() };
    alerts.unshift(a); emit('alert:new', a);
    return delay({ alert: a });
  }
  if ((m = path.match(/^\/alerts\/(\d+)$/)) && method === 'DELETE') {
    need('admin'); alerts = alerts.filter((a) => a.id !== +m[1]); emit('alert:removed', { id: +m[1] });
    return delay({ ok: true });
  }

  // ---- tasks
  if (path === '/tasks' && method === 'GET') {
    need('admin', 'volunteer');
    let rows = tasks;
    if (q.get('mine')) rows = rows.filter((t) => t.assigned_to === me.id);
    if (q.get('status')) rows = rows.filter((t) => t.status === q.get('status'));
    return delay({ tasks: clone([...rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))) });
  }
  if (path === '/tasks' && method === 'POST') {
    need('admin');
    const inc = incidents.find((i) => i.id === body.incident_id);
    const t = { id: nid(), title: body.title, description: body.description || '', required_skill: body.required_skill || '', status: 'open', incident_id: body.incident_id, incident_title: inc?.title || '', assigned_to: null, assignee_name: null, created_at: new Date().toISOString() };
    tasks.unshift(t); emit('task:changed', t);
    return delay({ task: t });
  }
  if ((m = path.match(/^\/tasks\/(\d+)(?:\/(accept|release|assign|status))?$/))) {
    need('admin', 'volunteer');
    const t = tasks.find((x) => x.id === +m[1]); if (!t) throw fail(404, 'Task not found.');
    const act = m[2];
    if (!act && method === 'DELETE') { need('admin'); tasks = tasks.filter((x) => x.id !== t.id); }
    else if (act === 'accept') { if (t.status !== 'open') throw fail(409, 'Someone already claimed this task.'); Object.assign(t, { status: 'assigned', assigned_to: me.id, assignee_name: me.name }); }
    else if (act === 'release') Object.assign(t, { status: 'open', assigned_to: null, assignee_name: null });
    else if (act === 'assign') { need('admin'); const v = users.find((u) => u.id === body.volunteer_id); Object.assign(t, { status: 'assigned', assigned_to: v.id, assignee_name: v.name }); }
    else if (act === 'status') t.status = body.status;
    emit('task:changed', t);
    return delay({ task: clone(t) });
  }

  throw fail(404, `Demo server has no route for ${method} ${path}`);
}
