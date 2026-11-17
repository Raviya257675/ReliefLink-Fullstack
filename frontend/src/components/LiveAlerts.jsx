import { useLive } from '../hooks/useLive.js';
import { useToast } from '../context/ToastContext.jsx';

// Pops a toast for every live broadcast, on any page.
export default function LiveAlerts() {
  const toast = useToast();
  useLive(['alert:new'], (a) => toast(a.message, a.level === 'danger' ? 'danger' : a.level === 'warning' ? 'warning' : 'info'));
  useLive(['incident:new'], (i) => i.severity === 'critical' && toast(`Critical incident: ${i.title}`, 'danger'));
  return null;
}
