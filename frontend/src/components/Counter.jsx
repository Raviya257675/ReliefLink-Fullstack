import { useEffect, useState } from 'react';

// Counts up to `value` once it is known (instantly when the user prefers reduced motion).
export default function Counter({ value = 0 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setN(value); return undefined; }
    let raf; const start = performance.now(); const from = 0;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 1000);
      setN(Math.round(from + (value - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n.toLocaleString()}</>;
}
