import { useEffect, useRef, useState } from 'react';
import { socket } from '../socket.js';

// Run `handler` whenever one of the named socket events arrives.
export function useLive(events, handler) {
  const ref = useRef(handler);
  ref.current = handler;
  const key = events.join(',');
  useEffect(() => {
    const fn = (...args) => ref.current(...args);
    events.forEach((e) => socket.on(e, fn));
    return () => events.forEach((e) => socket.off(e, fn));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

export function useConnected() {
  const [on, setOn] = useState(socket.connected);
  useEffect(() => {
    const up = () => setOn(true);
    const down = () => setOn(false);
    socket.on('connect', up);
    socket.on('disconnect', down);
    return () => { socket.off('connect', up); socket.off('disconnect', down); };
  }, []);
  return on;
}
