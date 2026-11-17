import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import Modal from '../components/Modal.jsx';
import MapView, { LocationPicker } from '../components/MapView.jsx';
import { SeverityBadge, StatusBadge } from '../components/Badge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useLive } from '../hooks/useLive.js';
import { TYPES, SEVERITIES, STATUSES, label, timeAgo } from '../utils.js';

const RANK = { critical: 0, high: 1, medium: 2, low: 3 };

function ReportForm({ sos, onDone }) {
  const toast = useToast();
  const [form, setForm] = useState(sos
    ? { title: 'Emergency – help needed', type: 'medical', severity: 'critical', description: '', address: '' }
    : { title: '', type: 'flood', severity: 'medium', description: '', address: '' });
  const [pos, setPos] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const locate = useCallback(() => {
    if (!navigator.geolocation) return setError('Your browser does not support location. Click the map instead.');
    navigator.geolocation.getCurrentPosition(
      (p) => { setError(''); setPos({ lat: +p.coords.latitude.toFixed(5), lng: +p.coords.longitude.toFixed(5) }); },
      () => setError('Could not get your location. Click the map to choose it instead.')
    );
  }, []);
  useEffect(() => { if (sos) locate(); }, [sos, locate]);

  async function submit(e) {
    e.preventDefault();
    if (!pos) return setError('Choose the location by clicking the map or using your current location.');
    setError(''); setBusy(true);
    try { await api.post('/incidents', { ...form, ...pos }); toast('Incident saved to ReliefLink. Connected viewers receive a live update; emergency services are not automatically notified.'); onDone(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <form className="form" onSubmit={submit}>
      {sos && <div className="alert alert-danger"><p><strong>SOS mode.</strong> Your location is being detected. For life-threatening emergencies also call 117 or 1990.</p></div>}
      {error && <div className="form-error" role="alert">{error}</div>}
      <label>What is happening?<input required minLength={3} maxLength={120} value={form.title} onChange={set('title')} placeholder="e.g. River overflowing into homes" /></label>
      <div className="row">
        <label>Type<select value={form.type} onChange={set('type')}>{TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}</select></label>
        <label>Severity<select value={form.severity} onChange={set('severity')}>{SEVERITIES.map((t) => <option key={t} value={t}>{label(t)}</option>)}</select></label>
      </div>
      <label>Details<textarea rows={3} maxLength={1000} value={form.description} onChange={set('description')} placeholder="How many people are affected? What help is needed?" /></label>
      <label>Address or landmark<input maxLength={200} value={form.address} onChange={set('address')} /></label>
      <div>
        <div className="row-between"><span className="field-label">Location</span><button type="button" className="btn btn-ghost btn-sm" onClick={locate}>Use my location</button></div>
        <LocationPicker value={pos} onChange={setPos} />
        <small className="muted">{pos ? `Selected: ${pos.lat}, ${pos.lng}` : 'Click the map to drop a pin.'}</small>
      </div>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send report'}</button>
    </form>
  );
}

function TaskForm({ incident, onDone }) {
  const toast = useToast();
  const [form, setForm] = useState({ title: '', description: '', required_skill: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    try { await api.post('/tasks', { ...form, incident_id: incident.id }); toast('Task created for volunteers.'); onDone(); }
    catch (err) { setError(err.message); }
  }
  return (
    <form className="form" onSubmit={submit}>
      {error && <div className="form-error">{error}</div>}
      <p className="muted">For: {incident.title}</p>
      <label>Task<input required minLength={3} value={form.title} onChange={set('title')} placeholder="e.g. Deliver drinking water" /></label>
      <label>Instructions<textarea rows={3} value={form.description} onChange={set('description')} /></label>
      <label>Skill needed (optional)<input value={form.required_skill} onChange={set('required_skill')} placeholder="first aid, driving…" /></label>
      <button className="btn btn-primary">Create task</button>
    </form>
  );
}

// Spreadsheet formula injection guard: prefix risky leading characters.
const cell = (v) => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
function exportCsv(rows) {
  const head = ['id', 'title', 'type', 'severity', 'status', 'address', 'lat', 'lng', 'reported_at'];
  const lines = [head.join(','), ...rows.map((i) => [i.id, i.title, i.type, i.severity, i.status, i.address, i.lat, i.lng, i.created_at].map(cell).join(','))];
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `incidents-${new Date().toISOString().slice(0, 10)}.csv` });
  a.click(); URL.revokeObjectURL(url);
}

export default function Incidents() {
  const { user } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState([]);
  const [filters, setFilters] = useState({ status: '', type: '', severity: '' });
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('newest');
  const [view, setView] = useState('list');
  const [loading, setLoading] = useState(true);
  const [taskFor, setTaskFor] = useState(null);
  const showForm = params.get('new') === '1' && !!user;
  const isAdmin = user?.role === 'admin';

  const load = useCallback(async () => {
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
    try { setList((await api.get(`/incidents${qs ? `?${qs}` : ''}`)).incidents); }
    catch (e) { toast(e.message, 'danger'); } finally { setLoading(false); }
  }, [filters, toast]);
  useEffect(() => { load(); }, [load]);
  useLive(['incident:new', 'incident:update', 'incident:delete'], load);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const rows = list.filter((i) => !t || `${i.title} ${i.address} ${i.description} ${i.type}`.toLowerCase().includes(t));
    if (sort === 'severity') rows.sort((a, b) => RANK[a.severity] - RANK[b.severity]);
    if (sort === 'oldest') rows.reverse();
    return rows;
  }, [list, q, sort]);

  const act = async (fn, ok) => { try { await fn(); if (ok) toast(ok); load(); } catch (e) { toast(e.message, 'danger'); } };
  const fset = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Incidents</h1><p className="muted">{loading ? 'Loading…' : `${shown.length} shown`}</p></div>
        {user ? <button className="btn btn-primary" onClick={() => setParams({ new: '1' })}>Report an incident</button>
          : <Link className="btn btn-primary" to="/login">Sign in to report</Link>}
      </div>

      <div className="toolbar">
        <input className="search" type="search" placeholder="Search title, place or details…" aria-label="Search incidents" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Filter by status" value={filters.status} onChange={fset('status')}><option value="">Any status</option>{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
        <select aria-label="Filter by type" value={filters.type} onChange={fset('type')}><option value="">Any type</option>{TYPES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
        <select aria-label="Filter by severity" value={filters.severity} onChange={fset('severity')}><option value="">Any severity</option>{SEVERITIES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
        <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="severity">Most severe first</option></select>
        <button className={`chip-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>List</button>
        <button className={`chip-btn ${view === 'map' ? 'active' : ''}`} onClick={() => setView('map')}>Map</button>
        <button className="btn btn-ghost btn-sm" disabled={!shown.length} onClick={() => exportCsv(shown)}>Export CSV</button>
      </div>

      {!loading && shown.length === 0 && <div className="empty"><h2>No incidents match</h2><p>Change the filters, or report one if you see an emergency.</p></div>}

      {view === 'map' && shown.length > 0 && <div className="panel panel-flush"><MapView incidents={shown} height={560} /></div>}

      {view === 'list' && (
        <div className="cards">
          {shown.map((i) => (
            <article key={i.id} className={`card sev-edge-${i.severity}`}>
              <div className="row-between"><SeverityBadge value={i.severity} /><StatusBadge value={i.status} /></div>
              <h3>{i.title}</h3>
              <p className="meta">{label(i.type)} · {i.address || `${i.lat.toFixed(3)}, ${i.lng.toFixed(3)}`}</p>
              {i.description && <p>{i.description}</p>}
              <p className="meta">Reported {timeAgo(i.created_at)}{i.reporter_name ? ` by ${i.reporter_name}` : ''}</p>
              {isAdmin && (
                <div className="card-actions">
                  <select aria-label="Change status" value={i.status} onChange={(e) => act(() => api.patch(`/incidents/${i.id}/status`, { status: e.target.value }), 'Status updated.')}>
                    {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                  </select>
                  <button className="btn btn-ghost btn-sm" onClick={() => setTaskFor(i)}>Create task</button>
                  <button className="btn btn-danger btn-sm" onClick={() => window.confirm('Delete this incident and its tasks?') && act(() => api.del(`/incidents/${i.id}`), 'Incident deleted.')}>Delete</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {showForm && <Modal title={params.get('sos') === '1' ? 'Emergency report' : 'Report an incident'} onClose={() => setParams({})} wide><ReportForm sos={params.get('sos') === '1'} onDone={() => { setParams({}); load(); }} /></Modal>}
      {taskFor && <Modal title="Create a relief task" onClose={() => setTaskFor(null)}><TaskForm incident={taskFor} onDone={() => setTaskFor(null)} /></Modal>}
    </div>
  );
}
