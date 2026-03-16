import db from '../db.js';
import { updateMeta, isTableEmpty, getLastUpdate, safeInterval } from '../utils/scheduler.js';
import { fetchIpv4 } from '../utils/fetchIpv4.js';
import config from '../config.js';

const { OVERPASS_URL } = config;

// Query telecom infrastructure from OSM via Overpass
// Covers: masts, communication lines, data centers
const QUERIES = [
  {
    layer: 'mast',
    query: `[out:json][timeout:180];(node["man_made"="mast"]["tower:type"~"communication|telecommunication"];node["man_made"="communications_tower"];);out body;`,
  },
  {
    layer: 'data_center',
    query: `[out:json][timeout:120];(nwr["telecom"="data_center"];nwr["building"="data_center"];);out center body;`,
  },
  {
    layer: 'comm_line',
    query: `[out:json][timeout:120];(way["man_made"="submarine_cable"];way["communication"="line"];);out center body;`,
  },
];

async function fetchTelecom() {
  console.log('[telecom] Fetching from Overpass API...');
  try {
    let totalCount = 0;

    for (const { layer, query } of QUERIES) {
      let data;
      try {
        const res = await fetchIpv4(OVERPASS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
        });
        if (!res.ok) {
          console.warn(`[telecom] ${layer} fetch error:`, res.status);
          continue;
        }
        data = await res.json();
      } catch (e) {
        console.warn(`[telecom] ${layer} error:`, e.message);
        continue;
      }

      const BATCH = 200;
      let batch = [];
      let count = 0;

      for (const el of data.elements) {
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

      console.log(`[telecom] ${layer}: ${count} points`);
      totalCount += count;
    }

    await updateMeta('telecom', totalCount);
    console.log('[telecom] Total upserted:', totalCount, 'points');
  } catch (e) {
    console.error('[telecom] error:', e.message);
  }
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
