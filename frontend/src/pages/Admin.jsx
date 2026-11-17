import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useLive } from '../hooks/useLive.js';
import { timeAgo } from '../utils.js';

export default function Admin() {
  const toast = useToast();
  const [alerts, setAlerts] = useState([]);
  const [vols, setVols] = useState([]);
  const [form, setForm] = useState({ message: '', level: 'warning' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, v] = await Promise.all([api.get('/alerts'), api.get('/users/volunteers')]);
      setAlerts(a.alerts); setVols(v.volunteers);
    } catch (e) { toast(e.message, 'danger'); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);
  useLive(['alert:new', 'alert:removed', 'task:changed'], load);

  async function send(e) {
    e.preventDefault(); setBusy(true);
    try { await api.post('/alerts', form); setForm({ ...form, message: '' }); toast('Alert broadcast to everyone online.'); load(); }
    catch (err) { toast(err.message, 'danger'); } finally { setBusy(false); }
  }

  return (
    <div className="page">
      <div className="page-head"><div><h1>Admin</h1><p className="muted">Broadcast alerts and see who is available to help.</p></div></div>
      <div className="grid-two">
        <section className="panel">
          <h2>Broadcast an alert</h2>
          <form className="form" onSubmit={send}>
            <label>Message<textarea required minLength={5} maxLength={300} rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="e.g. Evacuate low-lying areas near the river now." /></label>
            <label>Level<select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}><option value="info">Information</option><option value="warning">Warning</option><option value="danger">Danger</option></select></label>
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send alert'}</button>
          </form>
          <h3 className="sub">Recent alerts</h3>
          {alerts.length === 0 && <p className="muted">No alerts sent yet.</p>}
          <ul className="alert-list">
            {alerts.map((a) => (
              <li key={a.id} className={`alert alert-${a.level}`}>
                <p>{a.message}</p>
                <small>{timeAgo(a.created_at)} · <button className="linkbtn" onClick={() => api.del(`/alerts/${a.id}`).then(() => { toast('Alert removed.'); load(); }).catch((e) => toast(e.message, 'danger'))}>Remove</button></small>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <h2>Volunteers ({vols.length})</h2>
          {vols.length === 0 && <p className="muted">No volunteers have registered yet.</p>}
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Skills</th><th>Status</th><th>Active</th><th>Done</th></tr></thead>
              <tbody>
                {vols.map((v) => (
                  <tr key={v.id}>
                    <td><strong>{v.name}</strong><br /><small>{v.phone || v.email}</small></td>
                    <td>{v.skills || '–'}</td>
                    <td><span className={`badge ${v.availability ? 'sh-open' : 'sh-closed'}`}>{v.availability ? 'Available' : 'Unavailable'}</span></td>
                    <td>{v.active_tasks}</td><td>{v.completed_tasks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
