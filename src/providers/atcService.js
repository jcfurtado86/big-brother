import { idbGet, idbSet } from '../utils/idbCache';
import { ATC_TTL_MS } from './constants';
import { API_URL } from '../utils/api';

const IDB_STORE = 'atc';
const IDB_KEY = 'global';

// ── In-memory cache ──────────────────────────────────────────────────────

let globalCache = null;

// ── Fetch all ATC data worldwide ─────────────────────────────────────────

export async function fetchAllAtc(signal) {
  if (globalCache) {
    console.log('[ATC] Retornando do cache em memória:', globalCache.length, 'pontos');
    return globalCache;
  }

  // Check IDB cache
  const cached = await idbGet(IDB_STORE, IDB_KEY);
  if (cached && (Date.now() - cached.ts) < ATC_TTL_MS) {
    console.log('[ATC] Retornando do IDB cache:', cached.data.length, 'pontos, idade:', Math.round((Date.now() - cached.ts) / 60000), 'min');
    globalCache = cached.data;
    return globalCache;
  }

  console.log('[ATC] Fazendo fetch global da API...');

  const res = await fetch(`${API_URL}/api/atc?bbox=-90,-180,90,180`, { signal });

  if (!res.ok) {
    console.warn('[ATC] Fetch falhou, status:', res.status);
    return globalCache ?? [];
  }

  const rows = await res.json();
  const points = rows.map(r => ({
    ...(r.meta || {}),
    id: `atc_${r.osm_id}`,
    lat: r.lat,
    lon: r.lon,
    category: r.category,
    name: r.name || '',
    operator: r.operator || '',
    icao: r.icao || '',
    frequency: r.frequency || '',
  }));

  console.log('[ATC] Fetch OK:', points.length, 'pontos (' +
    points.filter(p => p.category === 'control_tower').length + ' torres, ' +
    points.filter(p => p.category === 'radar').length + ' radares)');

  globalCache = points;
  idbSet(IDB_STORE, IDB_KEY, { ts: Date.now(), data: points });
  return points;
}
