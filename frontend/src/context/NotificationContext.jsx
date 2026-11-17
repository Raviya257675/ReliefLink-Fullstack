import { createContext, useCallback, useContext, useState } from 'react';
import { useLive } from '../hooks/useLive.js';
import { label } from '../utils.js';

const Ctx = createContext({ items: [], unread: 0, markRead() {}, clear() {} });
export const useNotifications = () => useContext(Ctx);

// Collects every live event so users can review what they missed (bell menu + dashboard feed).
export function NotificationProvider({ children }) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const add = useCallback((icon, text, level = 'info') => {
    setItems((l) => [{ id: Math.random().toString(36).slice(2), icon, text, level, at: new Date().toISOString() }, ...l].slice(0, 40));
    setUnread((u) => u + 1);
  }, []);

  useLive(['alert:new'], (a) => add(a.level === 'danger' ? '🚨' : '📢', a.message, a.level));
  useLive(['incident:new'], (i) => add('📍', `New ${i.severity} ${i.type} report: ${i.title}`, i.severity === 'critical' ? 'danger' : 'info'));
  useLive(['incident:update'], (i) => add('🔄', `${i.title} is now ${label(i.status).toLowerCase()}`));
  useLive(['shelter:update'], (s) => !s.deleted && add('🏠', `${s.name}: ${s.occupancy}/${s.capacity} places taken`));

  return (
    <Ctx.Provider value={{ items, unread, markRead: () => setUnread(0), clear: () => { setItems([]); setUnread(0); } }}>
      {children}
    </Ctx.Provider>
  );
}
