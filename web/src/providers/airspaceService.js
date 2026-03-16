import { idbGet, idbSet } from '../utils/idbCache';
import { API_URL } from '../utils/api';

const IDB_STORE = 'airspace';
const IDB_KEY = 'global';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

const UNIT_MAP = { 0: 'M', 1: 'FT', 6: 'FL' };
const DATUM_MAP = { 0: 'GND', 1: 'MSL', 2: 'STD' };

let globalCache = null;

export async function fetchAllAirspaces(signal) {
  if (globalCache) {
    console.log('[Airspace] Retornando do cache em memória:', globalCache.length, 'zonas');
    return globalCache;
  }

  const cached = await idbGet(IDB_STORE, IDB_KEY);
  if (cached && cached.data?.length > 0 && (Date.now() - cached.ts) < CACHE_TTL_MS) {
    console.log('[Airspace] Retornando do IDB cache:', cached.data.length, 'zonas, idade:', Math.round((Date.now() - cached.ts) / 60000), 'min');
    globalCache = cached.data;
    return globalCache;
  }

  console.log('[Airspace] Fazendo fetch global da API...');

  const res = await fetch(`${API_URL}/api/airspace?bbox=-90,-180,90,180`, { signal });

  if (!res.ok) {
    console.warn('[Airspace] Fetch falhou, status:', res.status);
    return globalCache ?? [];
  }

  const rows = await res.json();
  const allZones = rows.map(r => {
    const coords = r.coordinates; // outer ring [lon, lat]

    // Compute centroid for bbox filtering
    let latSum = 0, lonSum = 0;
    for (const [lon, lat] of coords) { latSum += lat; lonSum += lon; }
    const n = coords.length;

    const meta = r.meta || {};

    return {
      id: r.id,
      name: r.name || '',
      category: r.category || 'restricted',
      country: r.country || '',
      coordinates: coords,
      lat: latSum / n,
      lon: lonSum / n,
      upperLimit: formatLimit(meta.upperLimit),
      lowerLimit: formatLimit(meta.lowerLimit),
      upperLimitValue: r.upperLimitVal ?? 0,
      lowerLimitValue: r.lowerLimitVal ?? 0,
      upperLimitUnit: UNIT_MAP[meta.upperLimit?.unit] || '',
      lowerLimitUnit: UNIT_MAP[meta.lowerLimit?.unit] || '',
    };
  });

  const counts = {};
  for (const z of allZones) counts[z.category] = (counts[z.category] || 0) + 1;
  console.log('[Airspace] Fetch OK:', allZones.length, 'zonas', counts);

  globalCache = allZones;
  idbSet(IDB_STORE, IDB_KEY, { ts: Date.now(), data: allZones });
  return allZones;
}

function formatLimit(limit) {
  if (!limit) return '';
  const unit = UNIT_MAP[limit.unit] || '';
  const datum = DATUM_MAP[limit.referenceDatum] || '';
  if (unit === 'FL') return `FL${limit.value}`;
  return `${limit.value} ${unit} ${datum}`.trim();
}
