import { idbGet, idbSet } from '../utils/idbCache';
import { MILITARY_TTL_MS } from './constants';
import { API_URL } from '../utils/api';

const IDB_STORE = 'military';
const IDB_KEY = 'global';

let globalCache = null;

export async function fetchAllMilitary(signal) {
  if (globalCache) {
    return globalCache;
  }

  const cached = await idbGet(IDB_STORE, IDB_KEY);
  if (cached && cached.data?.length > 0 && (Date.now() - cached.ts) < MILITARY_TTL_MS) {
    console.log('[MIL] IDB cache:', cached.data.length, 'pontos');
    globalCache = cached.data;
    return globalCache;
  }

  console.log('[MIL] Fetch global da API...');

  const res = await fetch(`${API_URL}/api/military?bbox=-90,-180,90,180`, { signal });

  if (!res.ok) {
    console.warn('[MIL] Fetch falhou, status:', res.status);
    return globalCache ?? [];
  }

  const rows = await res.json();
  const points = rows.map(r => ({
    ...(r.meta || {}),
    id: `mil_${r.osm_id}`,
    lat: r.lat,
    lon: r.lon,
    category: r.category,
    name: r.name || '',
    operator: r.operator || '',
    country: r.country || '',
  }));

  const cats = {};
  for (const p of points) cats[p.category] = (cats[p.category] || 0) + 1;
  console.log('[MIL] Fetch OK:', points.length, 'pontos', cats);

  globalCache = points;
  idbSet(IDB_STORE, IDB_KEY, { ts: Date.now(), data: points });
  return points;
}
