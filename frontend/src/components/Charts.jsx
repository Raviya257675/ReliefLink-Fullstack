// Small dependency-free SVG/CSS charts.
export function Donut({ data, centerLabel = 'total' }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 70, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 180 180" width="180" height="180" role="img" aria-label={`${total} ${centerLabel}`}>
        <circle cx="90" cy="90" r={r} fill="none" stroke="var(--paper-2)" strokeWidth="22" />
        {total > 0 && data.filter((d) => d.value > 0).map((d) => {
          const len = (d.value / total) * c;
          const el = <circle key={d.label} cx="90" cy="90" r={r} fill="none" stroke={d.color} strokeWidth="22"
            strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} transform="rotate(-90 90 90)" />;
          offset += len;
          return el;
        })}
        <text x="90" y="92" className="donut-num">{total}</text>
        <text x="90" y="110" className="donut-sub">{centerLabel}</text>
      </svg>
      <div className="dlegend">{data.map((d) => <span key={d.label}><i style={{ background: d.color }} />{d.label} ({d.value})</span>)}</div>
    </div>
  );
}

export function HBars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return data.map((d) => (
    <div className="chart-row" key={d.label}>
      <span>{d.label}</span>
      <div className="chart-track"><i style={{ width: `${(d.value / max) * 100}%`, background: d.color }} /></div>
      <strong>{d.value}</strong>
    </div>
  ));
}

export function Columns({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="cols">
      {data.map((d) => (
        <div className="col" key={d.label}><b>{d.value}</b><i style={{ height: `${(d.value / max) * 100}%` }} /><span>{d.label}</span></div>
      ))}
    </div>
  );
}
