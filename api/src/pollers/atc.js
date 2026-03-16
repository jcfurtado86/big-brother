import db from '../db.js';
import { updateMeta, isTableEmpty, getLastUpdate, safeInterval, withRetry } from '../utils/scheduler.js';
import { fetchIpv4 } from '../utils/fetchIpv4.js';
import config from '../config.js';

const { OVERPASS_URL } = config;

async function fetchAtc() {
  console.log('[atc] Fetching from Overpass API...');

  const count = await withRetry(async () => {
    const query = `[out:json][timeout:90];(node["aeroway"="control_tower"];node["man_made"="tower"]["tower:type"="radar"];);out body;`;
    const res = await fetchIpv4(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    const BATCH = 200;
    let batch = [];
    let n = 0;

    for (const el of json.elements) {
      if (el.type !== 'node') continue;
      const tags = el.tags || {};
      const category = tags.aeroway === 'control_tower' ? 'control_tower' : 'radar';

      batch.push({
        osm_id: el.id,
        lat: el.lat,
        lon: el.lon,
        geom: db.raw(`ST_SetSRID(ST_MakePoint(?, ?), 4326)`, [el.lon, el.lat]),
        category,
        name: (tags.name || tags['name:en'] || '').substring(0, 200),
        operator: (tags.operator || '').substring(0, 200),
        icao: (tags.icao || tags.ref || '').substring(0, 10),
        frequency: (tags.frequency || tags['comm:freq'] || '').substring(0, 30),
        meta: JSON.stringify({
          height: tags.height || '',
          ele: tags.ele || '',
          description: tags.description || '',
        }),
        updated_at: new Date(),
      });

      if (batch.length >= BATCH) {
        await db('atc_points').insert(batch).onConflict('osm_id').merge();
        n += batch.length;
        batch = [];
      }
    }

    if (batch.length > 0) {
      await db('atc_points').insert(batch).onConflict('osm_id').merge();
      n += batch.length;
    }

    return n;
  }, { label: 'atc' });

  if (count != null) {
    await updateMeta('atc', count);
    console.log('[atc] Upserted', count, 'ATC points');
  }
}

export function startAtcPoller() {
  isTableEmpty('atc_points').then(empty => {
    if (empty) {
      fetchAtc();
    } else {
      getLastUpdate('atc').then(last => {
        const age = last ? Date.now() - new Date(last).getTime() : Infinity;
        if (age > config.ATC_POLL_MS) fetchAtc();
      });
    }
  });

  safeInterval(fetchAtc, config.ATC_POLL_MS);
}
