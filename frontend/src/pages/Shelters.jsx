import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import Modal from '../components/Modal.jsx';
import { LocationPicker } from '../components/MapView.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useLive } from '../hooks/useLive.js';
import { label, timeAgo } from '../utils.js';

const km = (a, b) => {
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

function ShelterForm({ onDone }) {
  const toast = useToast();
  const [f, setF] = useState({ name: '', address: '', capacity: 100, occupancy: 0, contact: '', supplies: '' });
  const [pos, setPos] = useState(null);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    if (!pos) return setError('Click the map to set the shelter location.');
    try {
      await api.post('/shelters', { ...f, capacity: Number(f.capacity), occupancy: Number(f.occupancy), ...pos });
      toast('Shelter added.'); onDone();
    } catch (err) { setError(err.message); }
  }
  return (
    <form className="form" onSubmit={submit}>
      {error && <div className="form-error">{error}</div>}
      <label>Name<input required minLength={2} value={f.name} onChange={set('name')} /></label>
      <label>Address<input value={f.address} onChange={set('address')} /></label>
      <div className="row">
        <label>Capacity<input type="number" min="0" required value={f.capacity} onChange={set('capacity')} /></label>
        <label>Currently sheltered<input type="number" min="0" required value={f.occupancy} onChange={set('occupancy')} /></label>
      </div>
      <label>Contact<input value={f.contact} onChange={set('contact')} /></label>
      <label>Supplies available<input value={f.supplies} onChange={set('supplies')} placeholder="food, water, blankets…" /></label>
      <LocationPicker value={pos} onChange={setPos} height={220} />
      <small className="muted">{pos ? `Selected: ${pos.lat}, ${pos.lng}` : 'Click the map to drop a pin.'}</small>
      <button className="btn btn-primary">Add shelter</button>
    </form>
  );
}

function OccupancyEditor({ shelter, onSave }) {
  const [val, setVal] = useState(shelter.occupancy);
  useEffect(() => setVal(shelter.occupancy), [shelter.occupancy]);
  return (
    <div className="inline-edit">
      <input type="number" min="0" max={shelter.capacity} aria-label="People sheltered" value={val} onChange={(e) => setVal(e.target.value)} />
      <button className="btn btn-ghost btn-sm" onClick={() => onSave(Number(val))}>Update count</button>
    </div>
  );
}

export default function Shelters() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'admin';
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [me, setMe] = useState(null);
  const [filter, setFilter] = useState('all');
  const [locating, setLocating] = useState(false);

  const load = useCallback(async () => {
    try { setList((await api.get('/shelters')).shelters); } catch (e) { toast(e.message, 'danger'); } finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);
  useLive(['shelter:update'], load);

  function findNearest() {
    if (!navigator.geolocation) return toast('Your browser does not support location.', 'danger');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setMe({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating(false); toast('Sorted by distance from you.'); },
      () => { setLocating(false); toast('Could not get your location. Allow location access and try again.', 'danger'); }
    );
  }
  const view = list
    .filter((s) => filter === 'all' || (filter === 'space' ? s.status === 'open' : s.status === filter))
    .map((s) => ({ ...s, dist: me ? km(me, s) : null }))
    .sort((a, b) => (me ? a.dist - b.dist : 0));

  const act = async (fn, ok) => { try { await fn(); toast(ok); load(); } catch (e) { toast(e.message, 'danger'); } };

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Shelters</h1><p className="muted">Live occupancy so people go where there is space.</p></div>
        {isAdmin && <button className="btn btn-primary" onClick={() => setAdding(true)}>Add shelter</button>}
      </div>
      <div className="toolbar">
        <button className="btn btn-primary btn-sm" onClick={findNearest} disabled={locating}>{locating ? 'Locating…' : '📍 Find nearest to me'}</button>
        {[['all', 'All'], ['space', 'Has space'], ['full', 'Full'], ['closed', 'Closed']].map(([k, t]) => (
          <button key={k} className={`chip-btn ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>{t}</button>
        ))}
      </div>
      {!loading && list.length === 0 && <div className="empty"><h2>No shelters listed</h2><p>{isAdmin ? 'Add the first one.' : 'Shelters will appear here once they open.'}</p></div>}
      <div className="cards">
        {view.map((s) => {
          const pct = s.capacity ? Math.min(100, Math.round((s.occupancy / s.capacity) * 100)) : 100;
          return (
            <article key={s.id} className="card">
              <div className="row-between"><span className={`badge sh-${s.status}`}>{label(s.status)}</span><small className="muted">{s.dist !== null ? `${s.dist.toFixed(1)} km away` : `Updated ${timeAgo(s.updated_at)}`}</small></div>
              <h3>{s.name}</h3>
              <p className="meta">{s.address}</p>
              <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Occupancy"><i className={pct >= 90 ? 'hot' : ''} style={{ width: `${pct}%` }} /></div>
              <p className="meta"><strong>{s.occupancy}</strong> of {s.capacity} places taken ({s.capacity - s.occupancy > 0 ? `${s.capacity - s.occupancy} free` : 'no space left'})</p>
              {s.supplies && <p className="meta">Supplies: {s.supplies}</p>}
              {s.contact && <p className="meta">Contact: {s.contact}</p>}
              <div className="card-actions">
                <a className="btn btn-ghost btn-sm" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`}>Directions</a>
                {s.contact && <a className="btn btn-ghost btn-sm" href={`tel:${s.contact.replace(/[^+\d]/g, '')}`}>Call</a>}
              </div>
              {isAdmin && (
                <div className="card-actions">
                  <OccupancyEditor shelter={s} onSave={(occupancy) => act(() => api.patch(`/shelters/${s.id}`, { occupancy }), 'Occupancy updated.')} />
                  <button className="btn btn-ghost btn-sm" onClick={() => act(() => api.patch(`/shelters/${s.id}`, { status: s.status === 'closed' ? 'open' : 'closed' }), s.status === 'closed' ? 'Shelter reopened.' : 'Shelter closed.')}>{s.status === 'closed' ? 'Reopen' : 'Close'}</button>
                  <button className="btn btn-danger btn-sm" onClick={() => window.confirm('Delete this shelter?') && act(() => api.del(`/shelters/${s.id}`), 'Shelter deleted.')}>Delete</button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {adding && <Modal title="Add a shelter" onClose={() => setAdding(false)} wide><ShelterForm onDone={() => { setAdding(false); load(); }} /></Modal>}
    </div>
  );
}
