import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useLive } from '../hooks/useLive.js';

// Scrolling banner showing the newest broadcast alerts on every page.
export default function Ticker() {
  const [alerts, setAlerts] = useState([]);
  const load = useCallback(() => api.get('/alerts').then((d) => setAlerts(d.alerts.slice(0, 3))).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  useLive(['alert:new', 'alert:removed'], load);
  if (!alerts.length) return null;
  const level = alerts.some((a) => a.level === 'danger') ? 'danger' : alerts.some((a) => a.level === 'warning') ? 'warning' : 'info';
  return (
    <div className={`ticker ticker-${level}`} role="marquee" aria-label="Active alerts">
      <span>🚨 {alerts.map((a) => a.message).join('   •   ')}</span>
    </div>
  );
}
