import db from '../db.js';
import { updateMeta, isTableEmpty, getLastUpdate, safeInterval, withRetry } from '../utils/scheduler.js';
import { fetchIpv4 } from '../utils/fetchIpv4.js';
import config from '../config.js';

const { OVERPASS_URL } = config;
const BETWEEN_DELAY = 5_000;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Masts are too heavy for a single global query — split by region
const MAST_REGIONS = [
  { name: 'Europe',        bbox: '35,-25,72,45' },
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
    timeout: 120,
    query: `[out:json][timeout:120];(way["man_made"="submarine_cable"];way["communication"="line"];);out center body;`,
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

    batch.push({
      id: `osm_${layer}_${el.id}`,
      lat,
      lon,
      geom: db.raw(`ST_SetSRID(ST_MakePoint(?, ?), 4326)`, [lon, lat]),
      layer,
      name: (tags.name || tags['name:en'] || '').substring(0, 200),
      operator: (tags.operator || '').substring(0, 200),
      meta: JSON.stringify({
        height: tags.height || '',
        frequency: tags.frequency || '',
        ref: tags.ref || '',
        description: tags.description || '',
      }),
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

async function fetchMastRegion(region) {
  const query = `[out:json][timeout:180][bbox:${region.bbox}];(node["man_made"="mast"]["tower:type"~"communication|telecommunication"];node["man_made"="communications_tower"];);out body;`;

  const res = await fetchIpv4(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
    timeout: 240_000,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  return upsertElements(data.elements, 'mast');
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
  console.log('[telecom] Fetching from Overpass API (sequential with retry)...');
  let total = 0;

  // Masts: fetch by region to avoid Overpass timeout
  for (const region of MAST_REGIONS) {
    const count = await withRetry(() => fetchMastRegion(region), { label: `telecom:mast:${region.name}` });
    if (count != null) {
      console.log(`[telecom] mast ${region.name}: ${count} points`);
      total += count;
    }
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
