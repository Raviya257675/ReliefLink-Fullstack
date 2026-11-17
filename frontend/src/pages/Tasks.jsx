import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useLive } from '../hooks/useLive.js';
import { label, timeAgo } from '../utils.js';

export default function Tasks() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user.role === 'admin';
  const [tab, setTab] = useState(isAdmin ? 'all' : 'open');
  const [tasks, setTasks] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const path = tab === 'mine' ? '/tasks?mine=1' : tab === 'open' ? '/tasks?status=open' : '/tasks';
      setTasks((await api.get(path)).tasks);
    } catch (e) { toast(e.message, 'danger'); } finally { setLoading(false); }
  }, [tab, toast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (isAdmin) api.get('/users/volunteers').then((d) => setVolunteers(d.volunteers)).catch(() => {}); }, [isAdmin]);
  useLive(['task:changed'], load);

  const run = async (fn, ok) => { try { await fn(); toast(ok); load(); } catch (e) { toast(e.message, 'danger'); load(); } };
  const tabs = isAdmin ? [['all', 'All tasks'], ['open', 'Open']] : [['open', 'Open tasks'], ['mine', 'My tasks']];

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Relief tasks</h1><p className="muted">{isAdmin ? 'Create tasks from an incident, then assign them or let volunteers claim them.' : 'Claim a task, update it as you go, and mark it done.'}</p></div>
      </div>
      <div className="tabs" role="tablist">
        {tabs.map(([k, t]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => { setLoading(true); setTab(k); }}>{t}</button>)}
      </div>

      {!loading && tasks.length === 0 && (
        <div className="empty"><h2>{tab === 'mine' ? 'You have no tasks yet' : 'No tasks here'}</h2>
          <p>{tab === 'mine' ? 'Open the “Open tasks” tab and claim one.' : isAdmin ? 'Create a task from an incident card.' : 'Check back soon – new tasks appear live.'}</p></div>
      )}

      <div className="cards">
        {tasks.map((t) => {
          const mine = t.assigned_to === user.id;
          return (
            <article key={t.id} className="card">
              <div className="row-between"><span className={`badge tk-${t.status}`}>{label(t.status)}</span>{t.required_skill && <span className="chip">{t.required_skill}</span>}</div>
              <h3>{t.title}</h3>
              {t.description && <p>{t.description}</p>}
              <p className="meta">{t.incident_title ? `For: ${t.incident_title} · ` : ''}{t.assignee_name ? `Assigned to ${mine ? 'you' : t.assignee_name} · ` : ''}{timeAgo(t.created_at)}</p>
              <div className="card-actions">
                {!isAdmin && t.status === 'open' && <button className="btn btn-primary btn-sm" onClick={() => run(() => api.post(`/tasks/${t.id}/accept`), 'Task claimed. Thank you!')}>Claim task</button>}
                {(mine || isAdmin) && t.status === 'assigned' && <button className="btn btn-primary btn-sm" onClick={() => run(() => api.patch(`/tasks/${t.id}/status`, { status: 'in_progress' }), 'Task started.')}>Start</button>}
                {(mine || isAdmin) && ['assigned', 'in_progress'].includes(t.status) && <button className="btn btn-primary btn-sm" onClick={() => run(() => api.patch(`/tasks/${t.id}/status`, { status: 'completed' }), 'Marked complete.')}>Complete</button>}
                {(mine || isAdmin) && ['assigned', 'in_progress'].includes(t.status) && <button className="btn btn-ghost btn-sm" onClick={() => run(() => api.post(`/tasks/${t.id}/release`), 'Task released.')}>Release</button>}
                {isAdmin && ['open', 'assigned'].includes(t.status) && (
                  <select aria-label="Assign volunteer" value="" onChange={(e) => e.target.value && run(() => api.post(`/tasks/${t.id}/assign`, { volunteer_id: Number(e.target.value) }), 'Volunteer assigned.')}>
                    <option value="">Assign to…</option>
                    {volunteers.map((v) => <option key={v.id} value={v.id}>{v.name}{v.availability ? '' : ' (unavailable)'}</option>)}
                  </select>
                )}
                {isAdmin && <button className="btn btn-danger btn-sm" onClick={() => window.confirm('Delete this task?') && run(() => api.del(`/tasks/${t.id}`), 'Task deleted.')}>Delete</button>}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
