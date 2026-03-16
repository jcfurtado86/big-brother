import db from '../db.js';
import { updateMeta, isTableEmpty, getLastUpdate, safeInterval } from '../utils/scheduler.js';
import { fetchIpv4 } from '../utils/fetchIpv4.js';
import config from '../config.js';

const { OVERPASS_URL } = config;

const WANTED_CATEGORIES = [
  'airfield', 'barracks', 'base', 'naval_base',
  'checkpoint', 'danger_area', 'range', 'training_area',
  'nuclear_explosion_site', 'office',
  'bunker', 'trench',
];

const MAX_RETRIES = 10;
const RETRY_DELAY = 15_000;
const BETWEEN_DELAY = 5_000;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchCategory(category) {
  const query = `[out:json][timeout:120];nwr["military"="${category}"];out center body;`;

  const res = await fetchIpv4(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const json = await res.json();
  const BATCH = 200;
  let batch = [];
  let count = 0;
  const seen = new Set();

  for (const el of json.elements) {
    const tags = el.tags || {};
    if (!tags.military) continue;

    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;

    const dedup = `${lat.toFixed(4)},${lon.toFixed(4)},${tags.military}`;
    if (seen.has(dedup)) continue;
    seen.add(dedup);

    batch.push({
      osm_id: el.id,
      lat,
      lon,
      geom: db.raw(`ST_SetSRID(ST_MakePoint(?, ?), 4326)`, [lon, lat]),
      category: tags.military,
      name: (tags.name || tags['name:en'] || '').substring(0, 200),
      operator: (tags.operator || '').substring(0, 200),
      country: (tags['addr:country'] || tags.country || '').substring(0, 5),
      meta: JSON.stringify({
        militaryService: tags.military_service || '',
        serviceBranch: tags.service_branch || '',
        baseFunction: tags.base_function || '',
        icao: tags.icao || '',
        iata: tags.iata || '',
        access: tags.access || '',
        website: tags.website || '',
        wikidata: tags.wikidata || '',
        startDate: tags.start_date || '',
      }),
      updated_at: new Date(),
    });

    if (batch.length >= BATCH) {
      await db('military_points').insert(batch).onConflict('osm_id').merge();
      count += batch.length;
      batch = [];
    }
  }

  if (batch.length > 0) {
    await db('military_points').insert(batch).onConflict('osm_id').merge();
    count += batch.length;
  }

  return count;
}

async function fetchWithRetry(category) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const count = await fetchCategory(category);
      console.log(`[military] ${category}: ${count} points`);
      return count;
    } catch (e) {
      console.warn(`[military] ${category}: ${e.message} (attempt ${attempt}/${MAX_RETRIES})`);
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY);
    }
  }
  console.error(`[military] ${category}: failed after ${MAX_RETRIES} attempts`);
  return 0;
}

async function fetchMilitary() {
  console.log('[military] Fetching from Overpass API (sequential with retry)...');
  let total = 0;

  for (const category of WANTED_CATEGORIES) {
    const count = await fetchWithRetry(category);
    total += count;
    await sleep(BETWEEN_DELAY);
  }

  await updateMeta('military', total);
  console.log('[military] Total upserted:', total, 'points');
}

export function startMilitaryPoller() {
  isTableEmpty('military_points').then(empty => {
    if (empty) {
      fetchMilitary();
    } else {
      getLastUpdate('military').then(last => {
        const age = last ? Date.now() - new Date(last).getTime() : Infinity;
        if (age > config.MILITARY_POLL_MS) fetchMilitary();
      });
    }
  });

  safeInterval(fetchMilitary, config.MILITARY_POLL_MS);
}
