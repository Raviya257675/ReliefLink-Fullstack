import { useEffect, useRef, useState } from 'react';
import { useNotifications } from '../context/NotificationContext.jsx';
import { timeAgo } from '../utils.js';

export default function NotificationBell() {
  const { items, unread, markRead, clear } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="notif" ref={ref}>
      <button className="round-btn" aria-label={`Notifications, ${unread} unread`} onClick={() => { setOpen(!open); markRead(); }}>
        🔔{unread > 0 && <span className="count">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-head"><strong>Live notifications</strong>{items.length > 0 && <button className="linkbtn" onClick={clear}>Clear</button>}</div>
          {items.length === 0 && <div className="notif-empty">Nothing yet. New reports and alerts appear here instantly.</div>}
          {items.map((n) => (
            <div key={n.id} className="notif-item"><span>{n.icon}</span><div><p>{n.text}</p><small>{timeAgo(n.at)}</small></div></div>
          ))}
        </div>
      )}
    </div>
  );
}
