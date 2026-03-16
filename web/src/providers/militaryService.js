import { API_URL } from '../utils/api';

export async function fetchAllMilitary(bbox, signal) {
  const res = await fetch(`${API_URL}/api/military?bbox=${bbox}`, { signal });
  if (!res.ok) {
    console.warn('[MIL] Fetch falhou, status:', res.status);
    return [];
  }

  const rows = await res.json();
  return rows.map(r => ({
    ...(r.meta || {}),
    id: `mil_${r.osm_id}`,
    lat: r.lat,
    lon: r.lon,
    category: r.category,
    name: r.name || '',
    operator: r.operator || '',
    country: r.country || '',
  }));
}
