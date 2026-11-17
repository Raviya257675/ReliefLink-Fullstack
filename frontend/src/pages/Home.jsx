import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import Counter from '../components/Counter.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useLive } from '../hooks/useLive.js';

const FEATURES = [
  ['📍', 'Live incident map', 'Every report appears on the map the second it is sent.', '/dashboard'],
  ['🏠', 'Nearest shelter finder', 'See open shelters sorted by distance from where you are.', '/shelters'],
  ['🙋', 'Volunteer task board', 'Claim relief work that matches your skills and track it to done.', '/tasks'],
  ['📊', 'Analytics', 'Charts of incident types, severity and response progress.', '/analytics'],
  ['🛟', 'Safety guides', 'What to do before, during and after floods, landslides and more.', '/safety'],
  ['☎️', 'Emergency contacts', 'One-tap calling and a location link you can send to rescuers.', '/contacts'],
];

export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const load = useCallback(() => api.get('/stats').then(setStats).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  useLive(['incident:new', 'incident:update', 'incident:delete', 'shelter:update'], load);

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div>
            <h1>Help reaches people faster when everyone sees the same picture.</h1>
            <p className="lead">Report incidents, find shelter with free space, and match volunteers to the work that needs doing. Updates reach every screen the moment they happen.</p>
            <div className="hero-cta">
              <Link className="btn btn-primary btn-lg" to={user ? '/incidents?new=1' : '/login'}>Report an emergency</Link>
              <Link className="btn btn-outline btn-lg" to="/shelters">Find nearest shelter</Link>
              {!user && <Link className="btn btn-outline btn-lg" to="/register">Volunteer with us</Link>}
            </div>
          </div>
          <div className="radar" aria-hidden="true">
            <span className="blip" style={{ top: '22%', left: '58%' }} /><span className="blip t" style={{ top: '60%', left: '24%' }} />
            <span className="blip y" style={{ top: '70%', left: '68%' }} /><span className="blip" style={{ top: '40%', left: '30%' }} />
            <span className="radar-label">Live coverage across the island</span>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="counters">
          <div className="counter"><strong><Counter value={stats?.incidents.active ?? 0} /></strong><span>incidents being handled</span></div>
          <div className="counter"><strong><Counter value={stats?.shelters.sheltered ?? 0} /></strong><span>people in shelters</span></div>
          <div className="counter"><strong><Counter value={stats?.volunteers.total ?? 0} /></strong><span>registered volunteers</span></div>
          <div className="counter"><strong><Counter value={stats?.tasks.completed ?? 0} /></strong><span>relief tasks completed</span></div>
        </div>
      </section>

      <div className="page">
        <h2 className="section-title">How a report becomes help</h2>
        <div className="steps" style={{ marginTop: '1.6rem' }}>
          <div className="step"><h3>Someone reports</h3><p className="muted">A citizen drops a pin and describes what is happening, or sends an SOS with their location.</p></div>
          <div className="step"><h3>Admins verify</h3><p className="muted">Coordinators confirm the report, set its status and turn it into tasks for volunteers.</p></div>
          <div className="step"><h3>Volunteers respond</h3><p className="muted">Volunteers claim tasks, send people to shelters with space and mark work complete.</p></div>
        </div>

        <h2 className="section-title" style={{ marginTop: '3rem' }}>Everything in one place</h2>
        <div className="feat" style={{ marginTop: '1rem' }}>
          {FEATURES.map(([ico, t, d, to]) => (
            <Link to={to} className="feat-card" key={t}><span className="ico">{ico}</span><h3>{t}</h3><p>{d}</p></Link>
          ))}
        </div>

        <div className="cta-band">
          <div><h2>Ready to help your community?</h2><p>Join as a volunteer, or create an account to report incidents.</p></div>
          <Link className="btn btn-primary btn-lg" to={user ? '/dashboard' : '/register'}>{user ? 'Open dashboard' : 'Create a free account'}</Link>
        </div>
      </div>
    </>
  );
}
