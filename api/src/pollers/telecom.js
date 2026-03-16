import db from '../db.js';
import { updateMeta, isTableEmpty, getLastUpdate, safeInterval, withRetry } from '../utils/scheduler.js';
import { fetchIpv4 } from '../utils/fetchIpv4.js';
import config from '../config.js';

const { OVERPASS_URL } = config;
const BETWEEN_DELAY = 5_000;
const MAX_DEPTH = 3; // max subdivision depth (4^3 = 64 sub-quadrants max)
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const MAST_QUERY_BODY = `(node["man_made"="mast"]["tower:type"~"communication|telecommunication"];node["man_made"="communications_tower"];node["man_made"="tower"]["tower:type"~"communication|telecommunication"];node["man_made"="antenna"];node["telecom"="antenna"];);out body;`;

// Base regions — auto-subdivided if Overpass times out
const MAST_REGIONS = [
  { name: 'Western Europe',     bbox: '36,-12,52,10' },
  { name: 'Central Europe',     bbox: '45,10,55,25' },
  { name: 'Eastern Europe',     bbox: '44,25,56,40' },
  { name: 'Scandinavia',        bbox: '55,4,72,32' },
  { name: 'Iberia+Italy+Balkans', bbox: '35,-10,46,30' },
  { name: 'UK+Ireland',         bbox: '49,-11,61,2' },
  { name: 'Russia/CIS',    bbox: '40,45,75,180' },
  { name: 'East Asia',     bbox: '10,100,55,150' },
  { name: 'South Asia',    bbox: '5,60,40,100' },
  { name: 'Middle East',   bbox: '12,25,42,60' },
  { name: 'Africa',        bbox: '-35,-20,38,52' },
  { name: 'North America', bbox: '15,-170,72,-50' },
  { name: 'Central/South America', bbox: '-56,-120,15,-30' },
  { name: 'Oceania',       bbox: '-50,110,0,180' },
];

const OTHER_LAYERS = [
  {
    layer: 'data_center',
    timeout: 120,
    query: `[out:json][timeout:120];(nwr["telecom"="data_center"];nwr["building"="data_center"];);out center body;`,
  },
  {
    layer: 'comm_line',
    timeout: 180,
    query: `[out:json][timeout:180];(way["man_made"="submarine_cable"];way["communication"="line"];);out geom body;`,
  },
];

async function upsertElements(elements, layer) {
  const BATCH = 200;
  let batch = [];
  let count = 0;

  for (const el of elements) {
    const tags = el.tags || {};
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;

    const metaObj = {
      height: tags.height || '',
      frequency: tags.frequency || '',
      ref: tags.ref || '',
      description: tags.description || '',
    };

    // For ways with geometry (comm_line), store the coordinates
    if (el.geometry && Array.isArray(el.geometry) && el.geometry.length >= 2) {
      metaObj.coords = el.geometry.map(g => ({ lat: g.lat, lon: g.lon }));
    }

    batch.push({
      id: `osm_${layer}_${el.id}`,
      lat,
      lon,
      geom: db.raw(`ST_SetSRID(ST_MakePoint(?, ?), 4326)`, [lon, lat]),
      layer,
      name: (tags.name || tags['name:en'] || '').substring(0, 200),
      operator: (tags.operator || '').substring(0, 200),
      meta: JSON.stringify(metaObj),
      updated_at: new Date(),
    });

    if (batch.length >= BATCH) {
      await db('telecom_points').insert(batch).onConflict('id').merge();
      count += batch.length;
      batch = [];
    }
  }

  if (batch.length > 0) {
    await db('telecom_points').insert(batch).onConflict('id').merge();
    count += batch.length;
  }

  return count;
}

// Split a bbox string "south,west,north,east" into 4 quadrants
function splitBbox(bboxStr) {
  const [s, w, n, e] = bboxStr.split(',').map(Number);
  const midLat = (s + n) / 2;
  const midLon = (w + e) / 2;
  return [
    { suffix: 'SW', bbox: `${s},${w},${midLat},${midLon}` },
    { suffix: 'SE', bbox: `${s},${midLon},${midLat},${e}` },
    { suffix: 'NW', bbox: `${midLat},${w},${n},${midLon}` },
    { suffix: 'NE', bbox: `${midLat},${midLon},${n},${e}` },
  ];
}

// Try to fetch a bbox; if it fails after retries, auto-subdivide into 4 quadrants
async function fetchMastBbox(name, bboxStr, depth = 0) {
  const query = `[out:json][timeout:180][bbox:${bboxStr}];${MAST_QUERY_BODY}`;

  try {
    const count = await withRetry(async () => {
      const res = await fetchIpv4(OVERPASS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        timeout: 240_000,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return upsertElements(data.elements, 'mast');
    }, { label: `telecom:mast:${name}`, maxRetries: 3, delayMs: 10_000 });

    if (count != null) {
      console.log(`[telecom] mast ${name}: ${count} points`);
      return count;
    }
  } catch {
    // withRetry returned undefined (all retries failed) — fall through to subdivide
  }

  // Failed — subdivide if we haven't hit max depth
  if (depth >= MAX_DEPTH) {
    console.warn(`[telecom] mast ${name}: gave up after max subdivision depth`);
    return 0;
  }

  console.log(`[telecom] mast ${name}: subdividing into 4 quadrants (depth ${depth + 1})`);
  const quads = splitBbox(bboxStr);
  let total = 0;
  for (const q of quads) {
    const subName = `${name}/${q.suffix}`;
    await sleep(BETWEEN_DELAY);
    total += await fetchMastBbox(subName, q.bbox, depth + 1);
  }
  return total;
}

async function fetchLayer({ layer, query, timeout }) {
  const res = await fetchIpv4(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
    timeout: (timeout + 60) * 1000,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  return upsertElements(data.elements, layer);
}

async function fetchTelecom() {
  console.log('[telecom] Fetching from Overpass API (auto-subdividing regions)...');
  let total = 0;

  // Masts: fetch by region with auto-subdivision on failure
  for (const region of MAST_REGIONS) {
    const count = await fetchMastBbox(region.name, region.bbox);
    total += count;
    await sleep(BETWEEN_DELAY);
  }

  // Other layers: single global query each
  for (const q of OTHER_LAYERS) {
    const count = await withRetry(() => fetchLayer(q), { label: `telecom:${q.layer}` });
    if (count != null) {
      console.log(`[telecom] ${q.layer}: ${count} points`);
      total += count;
    }
    await sleep(BETWEEN_DELAY);
  }

  await updateMeta('telecom', total);
  console.log('[telecom] Total upserted:', total, 'points');
}

export function startTelecomPoller() {
  isTableEmpty('telecom_points').then(empty => {
    if (empty) {
      fetchTelecom();
    } else {
      getLastUpdate('telecom').then(last => {
        const age = last ? Date.now() - new Date(last).getTime() : Infinity;
        if (age > config.TELECOM_POLL_MS) fetchTelecom();
      });
    }
  });

  safeInterval(fetchTelecom, config.TELECOM_POLL_MS);
}
