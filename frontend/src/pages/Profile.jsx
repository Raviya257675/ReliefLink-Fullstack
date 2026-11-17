import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const AWARDS = [[1, '🌱', 'First Responder'], [3, '🤝', 'Good Neighbour'], [5, '🛡️', 'Steady Hand'], [10, '🏅', 'Relief Hero'], [25, '🏆', 'Community Pillar']];

function Impact() {
  const [tasks, setTasks] = useState(null);
  useEffect(() => { api.get('/tasks?mine=1').then((d) => setTasks(d.tasks)).catch(() => setTasks([])); }, []);
  if (!tasks) return null;
  const done = tasks.filter((t) => t.status === 'completed').length;
  const active = tasks.filter((t) => ['assigned', 'in_progress'].includes(t.status)).length;
  const next = AWARDS.find(([n]) => done < n);
  return (
    <section className="panel" style={{ marginBottom: '1.25rem' }}>
      <h2>Your impact</h2>
      <p className="muted"><strong>{done}</strong> tasks completed · <strong>{active}</strong> in progress</p>
      {next && <><div className="bar"><i style={{ width: `${(done / next[0]) * 100}%` }} /></div><small className="muted">{next[0] - done} more to earn “{next[2]}”</small></>}
      <div className="badge-grid" style={{ marginTop: '1rem' }}>
        {AWARDS.map(([n, ico, name]) => (
          <div key={name} className={`award ${done >= n ? '' : 'locked'}`}><span className="ico">{ico}</span><strong>{name}</strong><small>{n} task{n > 1 ? 's' : ''}</small></div>
        ))}
      </div>
    </section>
  );
}

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ name: user.name, phone: user.phone || '', skills: user.skills || '', availability: user.availability });
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault(); setBusy(true);
    try { setUser((await api.patch('/auth/me', f)).user); toast('Profile saved.'); }
    catch (err) { toast(err.message, 'danger'); } finally { setBusy(false); }
  }

  return (
    <div className="page narrow">
      <div className="page-head"><div><h1>Your profile</h1><p className="muted">{user.email} · {user.role}</p></div></div>
      {user.role === 'volunteer' && <Impact />}
      <form className="panel form" onSubmit={save}>
        <label>Name<input required minLength={2} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label>Phone<input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
        {user.role === 'volunteer' && (
          <>
            <label>Skills<input value={f.skills} onChange={(e) => setF({ ...f, skills: e.target.value })} placeholder="first aid, driving, logistics" /></label>
            <label className="check"><input type="checkbox" checked={f.availability} onChange={(e) => setF({ ...f, availability: e.target.checked })} /> I am available for tasks right now</label>
          </>
        )}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </form>
    </div>
  );
}
