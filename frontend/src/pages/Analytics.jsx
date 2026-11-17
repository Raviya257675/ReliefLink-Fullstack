import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { Donut, HBars, Columns } from '../components/Charts.jsx';
import { useLive } from '../hooks/useLive.js';
import { TYPES, label } from '../utils.js';

const TYPE_COLOR = ['#1c7ed6', '#a0522d', '#7950f2', '#e8590c', '#c92a2a', '#e0a800', '#0b7285', '#868e96'];
const SEV = [['critical', '#c92a2a'], ['high', '#e8590c'], ['medium', '#e0a800'], ['low', '#2f9e6b']];
const ST = [['reported', '#868e96'], ['verified', '#1c7ed6'], ['in_progress', '#e8590c'], ['resolved', '#2f9e6b']];

export default function Analytics() {
  const [incidents, setIncidents] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [stats, setStats] = useState(null);

  const load = useCallback(async () => {
    try {
      const [i, s, st] = await Promise.all([api.get('/incidents'), api.get('/shelters'), api.get('/stats')]);
      setIncidents(i.incidents); setShelters(s.shelters); setStats(st);
    } catch { /* keep previous data */ }
  }, []);
  useEffect(() => { load(); }, [load]);
  useLive(['incident:new', 'incident:update', 'incident:delete', 'shelter:update', 'task:changed'], load);

  const d = useMemo(() => {
    const count = (key, v) => incidents.filter((i) => i[key] === v).length;
    const days = Array.from({ length: 7 }, (_, n) => { const t = new Date(); t.setDate(t.getDate() - (6 - n)); return t; });
    return {
      type: TYPES.map((t, n) => ({ label: label(t), value: count('type', t), color: TYPE_COLOR[n] })),
      sev: SEV.map(([k, c]) => ({ label: label(k), value: count('severity', k), color: c })),
      st: ST.map(([k, c]) => ({ label: label(k), value: count('status', k), color: c })),
      week: days.map((t) => ({
        label: t.toLocaleDateString(undefined, { weekday: 'short' }),
        value: incidents.filter((i) => new Date(i.created_at).toDateString() === t.toDateString()).length,
      })),
    };
  }, [incidents]);

  const total = incidents.length;
  const resolved = incidents.filter((i) => i.status === 'resolved').length;
  const rate = total ? Math.round((resolved / total) * 100) : 0;
  const occ = stats && stats.shelters.capacity ? Math.round((stats.shelters.sheltered / stats.shelters.capacity) * 100) : 0;
  const kpi = (ico, n, t) => (<div className="stat"><span className="ico">{ico}</span><div><strong>{n}</strong><span>{t}</span></div></div>);

  return (
    <div className="page">
      <div className="page-head"><div><h1>Analytics</h1><p className="muted">Live charts built from current reports, shelters and tasks.</p></div></div>
      <section className="stats">
        {kpi('📋', total, 'total reports')}
        {kpi('✅', `${rate}%`, 'resolved')}
        {kpi('🏠', `${occ}%`, 'shelter occupancy')}
        {kpi('🙋', stats?.volunteers.total ?? '–', 'volunteers')}
        {kpi('🛠️', stats?.tasks.completed ?? '–', 'tasks completed')}
      </section>
      <div className="grid-two">
        <section className="panel"><h2>Incidents by type</h2><Donut data={d.type} centerLabel="incidents" /></section>
        <section className="panel"><h2>Reports in the last 7 days</h2><Columns data={d.week} /></section>
        <section className="panel"><h2>By severity</h2><HBars data={d.sev} /></section>
        <section className="panel"><h2>Response progress</h2><HBars data={d.st} /></section>
        <section className="panel" style={{ gridColumn: '1 / -1' }}>
          <h2>Shelter capacity</h2>
          {shelters.length === 0 && <p className="muted">No shelters listed.</p>}
          <HBars data={shelters.map((s) => ({ label: s.name.slice(0, 16), value: s.occupancy, color: s.occupancy >= s.capacity ? '#c92a2a' : '#0b7285' }))} />
        </section>
      </div>
    </div>
  );
}
