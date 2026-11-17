import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SEVERITY_COLOR, esc, label } from '../utils.js';

const SRI_LANKA = [7.8731, 80.7718];

// Colored div icons avoid Leaflet's default marker images (which break under bundlers).
const dot = (color, shape) =>
  L.divIcon({
    className: '',
    html: `<span class="pin pin-${shape}" style="background:${color}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

function baseMap(el) {
  const map = L.map(el, { zoomControl: true }).setView(SRI_LANKA, 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
  return map;
}

export default function MapView({ incidents = [], shelters = [], height = 440 }) {
  const el = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);

  useEffect(() => {
    map.current = baseMap(el.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => { map.current.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (!layer.current) return;
    layer.current.clearLayers();
    const points = [];
    incidents.filter((i) => i.status !== 'resolved').forEach((i) => {
      L.marker([i.lat, i.lng], { icon: dot(SEVERITY_COLOR[i.severity], 'round') })
        .bindPopup(`<strong>${esc(i.title)}</strong><br>${esc(label(i.type))} &middot; ${esc(label(i.severity))}<br>${esc(i.address)}<br><em>${esc(label(i.status))}</em>`)
        .addTo(layer.current);
      points.push([i.lat, i.lng]);
    });
    shelters.filter((s) => s.status !== 'closed').forEach((s) => {
      L.marker([s.lat, s.lng], { icon: dot('#0b7285', 'square') })
        .bindPopup(`<strong>${esc(s.name)}</strong><br>Shelter &middot; ${esc(s.occupancy)}/${esc(s.capacity)} people<br>${esc(s.address)}`)
        .addTo(layer.current);
      points.push([s.lat, s.lng]);
    });
    if (points.length) map.current.fitBounds(points, { padding: [40, 40], maxZoom: 10 });
  }, [incidents, shelters]);

  return <div ref={el} className="map" style={{ height }} role="application" aria-label="Map of incidents and shelters" />;
}

// Click-to-pick location control used in the report form.
export function LocationPicker({ value, onChange, height = 260 }) {
  const el = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    map.current = baseMap(el.current);
    map.current.on('click', (e) => cb.current({ lat: +e.latlng.lat.toFixed(5), lng: +e.latlng.lng.toFixed(5) }));
    return () => { map.current.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (!map.current || !value) return;
    if (marker.current) marker.current.setLatLng([value.lat, value.lng]);
    else marker.current = L.marker([value.lat, value.lng], { icon: dot('#e8590c', 'round') }).addTo(map.current);
    map.current.setView([value.lat, value.lng], Math.max(map.current.getZoom(), 12));
  }, [value]);

  return <div ref={el} className="map" style={{ height }} />;
}
