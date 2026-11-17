import { useEffect, useRef, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useConnected } from '../hooks/useLive.js';
import NotificationBell from './NotificationBell.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const live = useConnected();
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const moreRef = useRef(null);
  const close = () => { setOpen(false); setMore(false); };
  const staff = user && (user.role === 'admin' || user.role === 'volunteer');

  useEffect(() => {
    const h = (e) => moreRef.current && !moreRef.current.contains(e.target) && setMore(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to="/" className="brand" onClick={close}><span className="brand-mark">+</span>ReliefLink</Link>
        <button className="nav-toggle" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>&#9776;</button>
        <nav className={`nav-links ${open ? 'open' : ''}`} onClick={close}>
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/incidents">Incidents</NavLink>
          <NavLink to="/shelters">Shelters</NavLink>
          {staff && <NavLink to="/tasks">Tasks</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
          <div className="more" ref={moreRef} onClick={(e) => e.stopPropagation()}>
            <button className="more-btn" onClick={() => setMore(!more)} aria-expanded={more}>More ▾</button>
            <div className={`more-menu ${more ? 'open' : ''}`} onClick={close}>
              <NavLink to="/analytics">Analytics</NavLink>
              <NavLink to="/safety">Safety guides</NavLink>
              <NavLink to="/contacts">Emergency contacts</NavLink>
            </div>
          </div>
        </nav>
        <div className={`nav-right ${open ? 'open' : ''}`}>
          <span className={`live ${live ? 'on' : ''}`} title={live ? 'Receiving live updates' : 'Reconnecting…'}><i />{live ? 'Live' : 'Offline'}</span>
          <NotificationBell />
          <button className="round-btn" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? '☀️' : '🌙'}</button>
          {user ? (
            <>
              <Link to="/profile" className="user-chip" onClick={close}>{user.name.split(' ')[0]} <small>{user.role}</small></Link>
              <button className="btn btn-ghost btn-sm" onClick={() => { logout(); close(); window.location.assign('/'); }}>Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm" onClick={close}>Sign in</Link>
              <Link to="/register" className="btn btn-primary btn-sm" onClick={close}>Join</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
