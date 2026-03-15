import { idbGet, idbSet } from '../utils/idbCache';
import { MILITARY_TTL_MS } from './constants';

const IDB_STORE = 'military';
const IDB_KEY = 'global';
const OVERPASS_URL = '/api/overpass/interpreter';

// Categories we actually display (excludes bunker/trench which have 100k+ entries)
const WANTED_CATEGORIES = [
  'airfield', 'barracks', 'base', 'naval_base',
  'checkpoint', 'danger_area', 'range', 'training_area',
  'nuclear_explosion_site', 'office',
];

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

  console.log('[MIL] Fetch global da Overpass API...');

  // Build union of explicit categories to avoid pulling bunker/trench (100k+ each)
  const filters = WANTED_CATEGORIES.map(c => `nwr["military"="${c}"]`).join(';');
  const query = `[out:json][timeout:180];(${filters};);out center body;`;

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
    signal,
  });

  if (!res.ok) {
    console.warn('[MIL] Fetch falhou, status:', res.status);
    return globalCache ?? [];
  }

  const json = await res.json();
  const points = parseOverpassResponse(json);

  const cats = {};
  for (const p of points) cats[p.category] = (cats[p.category] || 0) + 1;
  console.log('[MIL] Fetch OK:', points.length, 'pontos', cats);

  globalCache = points;
  idbSet(IDB_STORE, IDB_KEY, { ts: Date.now(), data: points });
  return points;
}

function parseOverpassResponse(json) {
  const points = [];
  const seen = new Set();

  for (const el of json.elements) {
    const tags = el.tags || {};
    const category = tags.military;
    if (!category) continue;

    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;

    // Deduplicate by rounded position + category
    const dedup = `${lat.toFixed(4)},${lon.toFixed(4)},${category}`;
    if (seen.has(dedup)) continue;
    seen.add(dedup);

    points.push({
      id: `mil_${el.id}`,
      lat,
      lon,
      category,
      name:            tags.name || tags['name:en'] || '',
      operator:        tags.operator || '',
      militaryService: tags.military_service || '',
      serviceBranch:   tags.service_branch || '',
      baseFunction:    tags.base_function || '',
      icao:            tags.icao || '',
      iata:            tags.iata || '',
      ref:             tags.ref || '',
      access:          tags.access || '',
      description:     tags.description || '',
      website:         tags.website || '',
      wikidata:        tags.wikidata || '',
      wikipedia:       tags.wikipedia || '',
      startDate:       tags.start_date || '',
      ele:             tags.ele || '',
      country:         tags['addr:country'] || tags['country'] || '',
    });
  }
  return points;
}
