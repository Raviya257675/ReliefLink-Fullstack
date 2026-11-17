import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import MapView from '../components/MapView.jsx';
import WeatherWidget from '../components/WeatherWidget.jsx';
import { SeverityBadge } from '../components/Badge.jsx';
import { useLive } from '../hooks/useLive.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { timeAgo, label } from '../utils.js';

const EVENTS = ['incident:new', 'incident:update', 'incident:delete', 'shelter:update', 'alert:new', 'alert:removed', 'task:changed'];

export default function Dashboard() {
  const { user } = useAuth();
  const { items } = useNotifications();
  const [stats, setStats] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, i, sh, a] = await Promise.all([api.get('/stats'), api.get('/incidents'), api.get('/shelters'), api.get('/alerts')]);
      setStats(s); setIncidents(i.incidents); setShelters(sh.shelters); setAlerts(a.alerts); setError('');
    } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useLive(EVENTS, load);

  const active = incidents.filter((i) => i.status !== 'resolved');
  const card = (ico, n, text, c) => (<div className="stat" style={{ '--c': c }}><span className="ico">{ico}</span><div><strong>{n ?? '–'}</strong><span>{text}</span></div></div>);

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>{user ? `Hello, ${user.name.split(' ')[0]}` : 'Situation overview'}</h1><p className="muted">Everything on this page updates live. No refresh needed.</p></div>
        <Link className="btn btn-primary" to={user ? '/incidents?new=1' : '/login'}>Report an incident</Link>
      </div>
      {error && <div className="form-error">{error}</div>}

      <section className="stats">
        {card('🚨', stats?.incidents.active, 'active incidents', 'var(--high)')}
        {card('🔥', stats?.incidents.critical, 'critical', 'var(--crit)')}
        {card('🏠', stats ? `${stats.shelters.sheltered}/${stats.shelters.capacity}` : null, 'people in shelters', 'var(--teal)')}
        {card('🙋', stats?.volunteers.available, 'volunteers available', 'var(--low)')}
        {card('📋', stats?.tasks.open, 'open tasks', 'var(--info)')}
      </section>

      <div className="grid-main">
        <div className="stack">
          <div className="panel panel-flush">
            <MapView incidents={incidents} shelters={shelters} height={480} />
            <div className="legend">
              {['critical', 'high', 'medium', 'low'].map((s) => <span key={s} className={`sev-${s}`}><i className="pin-key" />{label(s)}</span>)}
              <span><i className="pin-key shelter" />Shelter</span>
            </div>
          </div>
          <WeatherWidget />
        </div>

        <div className="stack">
          <div className="panel">
            <h2>Alerts</h2>
            {alerts.length === 0 && <p className="muted">No active alerts.</p>}
            <ul className="alert-list">
              {alerts.slice(0, 4).map((a) => (<li key={a.id} className={`alert alert-${a.level}`}><p>{a.message}</p><small>{timeAgo(a.created_at)}</small></li>))}
            </ul>
          </div>
          <div className="panel">
            <h2>Live activity</h2>
            {items.length === 0 && <p className="muted">Waiting for new events. Reports, status changes and shelter updates will stream in here.</p>}
            <ul className="feed activity">
              {items.slice(0, 6).map((n) => (<li key={n.id}><span className="ico">{n.icon}</span><div><strong>{n.text}</strong><small>{timeAgo(n.at)}</small></div></li>))}
            </ul>
          </div>
          <div className="panel">
            <h2>Latest incidents</h2>
            {active.length === 0 && <p className="muted">No active incidents right now.</p>}
            <ul className="feed">
              {active.slice(0, 5).map((i) => (
                <li key={i.id}><SeverityBadge value={i.severity} />
                  <div><strong>{i.title}</strong><small>{label(i.type)} · {i.address || 'Location on map'} · {timeAgo(i.created_at)}</small></div></li>
              ))}
            </ul>
            <Link to="/incidents" className="link">See all incidents</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
