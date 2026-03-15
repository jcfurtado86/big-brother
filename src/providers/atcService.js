import { idbGet, idbSet } from '../utils/idbCache';
import { ATC_TTL_MS } from './constants';

const IDB_STORE = 'atc';
const IDB_KEY = 'global';
const OVERPASS_URL = '/api/overpass/interpreter';

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

  console.log('[ATC] Fazendo fetch global da Overpass API...');
  const query = `[out:json][timeout:90];(node["aeroway"="control_tower"];node["man_made"="tower"]["tower:type"="radar"];);out body;`;

  const res = await fetch(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`, { signal });

  if (!res.ok) {
    console.warn('[ATC] Fetch falhou, status:', res.status);
    return globalCache ?? [];
  }

  const json = await res.json();
  const points = parseOverpassResponse(json);

  console.log('[ATC] Fetch OK:', points.length, 'pontos (' +
    points.filter(p => p.category === 'control_tower').length + ' torres, ' +
    points.filter(p => p.category === 'radar').length + ' radares)');

  globalCache = points;
  idbSet(IDB_STORE, IDB_KEY, { ts: Date.now(), data: points });
  return points;
}

// ── Parse Overpass JSON → normalized points ──────────────────────────────

function parseOverpassResponse(json) {
  const points = [];
  for (const el of json.elements) {
    if (el.type !== 'node') continue;
    const tags = el.tags || {};

    const category = tags.aeroway === 'control_tower' ? 'control_tower' : 'radar';

    points.push({
      id: `atc_${el.id}`,
      lat: el.lat,
      lon: el.lon,
      category,
      name: tags.name || tags['name:en'] || '',
      operator: tags.operator || '',
      height: tags.height || '',
      icao: tags['icao'] || tags['ref'] || '',
      frequency: tags.frequency || tags['comm:freq'] || '',
      ele: tags.ele || '',
      description: tags.description || '',
    });
  }
  return points;
}
