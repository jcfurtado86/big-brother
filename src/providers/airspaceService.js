import { idbGet, idbSet } from '../utils/idbCache';

const IDB_STORE = 'airspace';
const IDB_KEY = 'global';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const API_BASE = 'https://api.core.openaip.net/api/airspaces';
const API_KEY = import.meta.env.VITE_OPENAIP_API_KEY;

// Types: 1=Restricted, 2=Danger, 3=Prohibited
const WANTED_TYPES = [1, 2, 3];
const PAGE_LIMIT = 1000;

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

  console.log('[Airspace] Fazendo fetch global da OpenAIP API...');

  const allZones = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    if (signal?.aborted) return globalCache ?? [];

    const url = `${API_BASE}?type=${WANTED_TYPES.join(',')}&limit=${PAGE_LIMIT}&page=${page}&apiKey=${API_KEY}`;
    const res = await fetch(url, { signal });

    if (!res.ok) {
      console.warn('[Airspace] Fetch falhou, status:', res.status, 'página:', page);
      return globalCache ?? [];
    }

    const json = await res.json();
    totalPages = json.totalPages || 1;

    for (const item of json.items) {
      const zone = parseAirspace(item);
      if (zone) allZones.push(zone);
    }

    console.log(`[Airspace] Página ${page}/${totalPages}, acumulado: ${allZones.length} zonas`);
    page++;
  }

  console.log('[Airspace] Fetch OK:', allZones.length, 'zonas (' +
    allZones.filter(z => z.category === 'restricted').length + ' restritas, ' +
    allZones.filter(z => z.category === 'danger').length + ' perigo, ' +
    allZones.filter(z => z.category === 'prohibited').length + ' proibidas)');

  globalCache = allZones;
  idbSet(IDB_STORE, IDB_KEY, { ts: Date.now(), data: allZones });
  return allZones;
}

function parseAirspace(item) {
  const geom = item.geometry;
  if (!geom || geom.type !== 'Polygon' || !geom.coordinates?.[0]?.length) return null;

  const coords = geom.coordinates[0]; // outer ring [lon, lat]

  // Compute centroid for bbox filtering
  let latSum = 0, lonSum = 0;
  for (const [lon, lat] of coords) { latSum += lat; lonSum += lon; }
  const n = coords.length;

  const typeMap = { 1: 'restricted', 2: 'danger', 3: 'prohibited' };
  const category = typeMap[item.type] || 'restricted';

  const unitMap = { 0: 'M', 1: 'FT', 6: 'FL' };
  const datumMap = { 0: 'GND', 1: 'MSL', 2: 'STD' };

  return {
    id: `asp_${item._id}`,
    name: item.name || '',
    category,
    country: item.country || '',
    coordinates: coords, // [[lon, lat], ...]
    lat: latSum / n,
    lon: lonSum / n,
    upperLimit: formatLimit(item.upperLimit, unitMap, datumMap),
    lowerLimit: formatLimit(item.lowerLimit, unitMap, datumMap),
    upperLimitValue: item.upperLimit?.value ?? 0,
    lowerLimitValue: item.lowerLimit?.value ?? 0,
    upperLimitUnit: unitMap[item.upperLimit?.unit] || '',
    lowerLimitUnit: unitMap[item.lowerLimit?.unit] || '',
  };
}

function formatLimit(limit, unitMap, datumMap) {
  if (!limit) return '';
  const unit = unitMap[limit.unit] || '';
  const datum = datumMap[limit.referenceDatum] || '';
  if (unit === 'FL') return `FL${limit.value}`;
  return `${limit.value} ${unit} ${datum}`.trim();
}
