import db from '../db.js';
import { updateMeta, isTableEmpty, getLastUpdate, safeInterval } from '../utils/scheduler.js';
import config from '../config.js';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const WANTED_CATEGORIES = [
  'airfield', 'barracks', 'base', 'naval_base',
  'checkpoint', 'danger_area', 'range', 'training_area',
  'nuclear_explosion_site', 'office',
];

async function fetchMilitary() {
  console.log('[military] Fetching from Overpass API...');
  try {
    const filters = WANTED_CATEGORIES.map(c => `nwr["military"="${c}"]`).join(';');
    const query = `[out:json][timeout:180];(${filters};);out center body;`;

    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!res.ok) {
      console.warn('[military] fetch error:', res.status);
      return;
    }

    const json = await res.json();
    const BATCH = 200;
    let batch = [];
    let count = 0;
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

      batch.push({
        osm_id: el.id,
        lat,
        lon,
        geom: db.raw(`ST_SetSRID(ST_MakePoint(?, ?), 4326)`, [lon, lat]),
        category,
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

    await updateMeta('military', count);
    console.log('[military] Upserted', count, 'military points');
  } catch (e) {
    console.error('[military] error:', e.message);
  }
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
