import { useState } from 'react';

const GUIDES = {
  Flood: { ico: '🌊',
    before: ['Know your area’s flood risk and the nearest shelter.', 'Move valuables, documents and medicines to a high place.', 'Keep a charged phone, torch and power bank ready.'],
    during: ['Move to higher ground immediately. Do not wait for instructions.', 'Never walk or drive through moving flood water.', 'Switch off electricity at the main if it is safe to reach.'],
    after: ['Return only when authorities say it is safe.', 'Boil or treat drinking water until it is declared safe.', 'Photograph damage before cleaning up.'] },
  Landslide: { ico: '⛰️',
    before: ['Watch for cracks in walls or ground, tilting trees or new springs.', 'Know two evacuation routes away from slopes.', 'Avoid building or sleeping below steep unstable slopes in heavy rain.'],
    during: ['Leave at once if you hear rumbling or see mud and rocks moving.', 'Move sideways out of the path, not down the slope.', 'If trapped, curl up and protect your head.'],
    after: ['Stay away from the slide area. More slides may follow.', 'Report trapped people to 117 instead of digging alone.', 'Check for broken water, gas and power lines.'] },
  Cyclone: { ico: '🌀',
    before: ['Secure the roof, windows and loose objects.', 'Store food and water for at least three days.', 'Fully charge phones and listen to official warnings.'],
    during: ['Stay indoors in the strongest room, away from windows.', 'Do not go out during the calm eye. The storm will return.', 'Keep a radio on for updates.'],
    after: ['Avoid fallen power lines and flooded roads.', 'Check on neighbours, especially older people.', 'Use torches, not candles, near possible gas leaks.'] },
  Earthquake: { ico: '🌐',
    before: ['Fix heavy furniture to walls.', 'Agree a family meeting point.', 'Know how to switch off gas, water and power.'],
    during: ['Drop, cover and hold on under sturdy furniture.', 'Stay away from windows and heavy objects.', 'If outdoors, move away from buildings and wires.'],
    after: ['Expect aftershocks. Leave damaged buildings.', 'Check yourself and others for injuries.', 'Use text messages, not calls, to keep lines free.'] },
  Fire: { ico: '🔥',
    before: ['Fit smoke alarms and test them monthly.', 'Plan and practise two exits from every room.', 'Keep exits and fire extinguishers clear.'],
    during: ['Get out, stay out and call 110.', 'Crawl low under smoke and feel doors before opening.', 'Never use a lift.'],
    after: ['Do not re-enter until firefighters say so.', 'Get medical care for smoke inhalation.', 'Contact your local authority for temporary shelter.'] },
};
const KIT = ['Drinking water (3 litres per person per day)', 'Dry food for 3 days', 'First-aid kit and regular medicines', 'Torch and spare batteries', 'Power bank and charging cable', 'Copies of ID and documents in a waterproof bag', 'Whistle', 'Battery or hand-crank radio', 'Warm clothes and blankets', 'Some cash in small notes', 'Written list of emergency numbers'];

function loadKit() { try { return JSON.parse(localStorage.getItem('kit') || '[]'); } catch { return []; } }

export default function Safety() {
  const [hazard, setHazard] = useState('Flood');
  const [done, setDone] = useState(loadKit);
  const g = GUIDES[hazard];
  const toggle = (i) => {
    const next = done.includes(i) ? done.filter((x) => x !== i) : [...done, i];
    setDone(next);
    try { localStorage.setItem('kit', JSON.stringify(next)); } catch { /* storage blocked */ }
  };
  const pct = Math.round((done.length / KIT.length) * 100);

  return (
    <div className="page">
      <div className="page-head"><div><h1>Safety guides</h1><p className="muted">Know what to do before, during and after a disaster.</p></div></div>
      <div className="tabs" role="tablist">
        {Object.keys(GUIDES).map((h) => <button key={h} role="tab" aria-selected={hazard === h} className={hazard === h ? 'active' : ''} onClick={() => setHazard(h)}>{GUIDES[h].ico} {h}</button>)}
      </div>
      <div className="grid-three">
        {[['Before', 'before'], ['During', 'during'], ['After', 'after']].map(([t, k]) => (
          <section className="panel" key={k}><h2>{t}</h2><ul className="guide-list">{g[k].map((x) => <li key={x}>{x}</li>)}</ul></section>
        ))}
      </div>
      <section className="panel" style={{ marginTop: '1.25rem' }}>
        <div className="row-between"><h2>🎒 Emergency kit checklist</h2><strong>{pct}% ready</strong></div>
        <div className="bar"><i style={{ width: `${pct}%` }} /></div>
        <ul className="kit" style={{ padding: 0, columns: '2 300px' }}>
          {KIT.map((k, i) => <li key={k}><label><input type="checkbox" checked={done.includes(i)} onChange={() => toggle(i)} /><span>{k}</span></label></li>)}
        </ul>
        <small className="muted">Your progress is saved on this device only.</small>
      </section>
    </div>
  );
}
