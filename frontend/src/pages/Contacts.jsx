import { useState } from 'react';
import { useToast } from '../context/ToastContext.jsx';

const CONTACTS = [
  ['117', 'Disaster Management Centre', 'Floods, landslides, cyclones and other disasters'],
  ['1990', 'Suwa Seriya Ambulance', 'Free emergency ambulance service'],
  ['119', 'Police emergency', 'Danger, crime and rescue support'],
  ['110', 'Fire and rescue', 'Fires and rescue from collapsed structures'],
  ['1919', 'Government information centre', 'Official information and guidance'],
];

function ShareLocation() {
  const toast = useToast();
  const [pos, setPos] = useState(null);
  const [busy, setBusy] = useState(false);
  const text = pos ? `I need help. My location: https://www.google.com/maps?q=${pos.lat},${pos.lng}` : '';

  function locate() {
    if (!navigator.geolocation) return toast('Your browser does not support location.', 'danger');
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos({ lat: +p.coords.latitude.toFixed(5), lng: +p.coords.longitude.toFixed(5) }); setBusy(false); },
      () => { setBusy(false); toast('Could not get your location. Allow location access and try again.', 'danger'); }
    );
  }
  async function copy() { try { await navigator.clipboard.writeText(text); toast('Copied. Paste it into a message.'); } catch { toast('Copy failed. Select the text and copy it manually.', 'danger'); } }

  return (
    <section className="panel">
      <h2>📡 Share my location</h2>
      <p className="muted">Get a map link with your exact position to send to family or rescuers.</p>
      <button className="btn btn-primary" onClick={locate} disabled={busy}>{busy ? 'Locating…' : 'Get my location'}</button>
      {pos && (
        <div className="form" style={{ marginTop: '1rem' }}>
          <textarea readOnly rows={2} value={text} aria-label="Location message" />
          <div className="card-actions" style={{ marginTop: 0 }}>
            <button className="btn btn-ghost btn-sm" onClick={copy}>Copy</button>
            <a className="btn btn-ghost btn-sm" href={`sms:?body=${encodeURIComponent(text)}`}>Send by SMS</a>
            <a className="btn btn-ghost btn-sm" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(text)}`}>WhatsApp</a>
          </div>
        </div>
      )}
    </section>
  );
}

export default function Contacts() {
  return (
    <div className="page">
      <div className="page-head"><div><h1>Emergency contacts</h1><p className="muted">Tap a number to call. Please confirm local numbers for your area.</p></div></div>
      <div className="grid-main">
        <div className="stack">
          {CONTACTS.map(([n, name, desc]) => (
            <div className="panel contact" key={n}>
              <div><h3>{name}</h3><p className="muted" style={{ margin: 0 }}>{desc}</p></div>
              <a className="btn btn-primary" href={`tel:${n}`}><span style={{ fontWeight: 800 }}>{n}</span> Call</a>
            </div>
          ))}
        </div>
        <ShareLocation />
      </div>
    </div>
  );
}
