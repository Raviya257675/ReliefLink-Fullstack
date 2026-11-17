export const TYPES = ['flood', 'landslide', 'cyclone', 'earthquake', 'fire', 'drought', 'medical', 'other'];
export const SEVERITIES = ['low', 'medium', 'high', 'critical'];
export const STATUSES = ['reported', 'verified', 'in_progress', 'resolved'];

export const SEVERITY_COLOR = { low: '#2f9e6b', medium: '#e0a800', high: '#e8590c', critical: '#c92a2a' };
export const label = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '');

export function timeAgo(iso) {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)} min ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)} h ago`;
  return `${Math.floor(secs / 86400)} d ago`;
}

// Escape text before putting it in Leaflet popups (they render HTML).
export const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
