import db from '../db.js';
import { updateMeta, isTableEmpty, getLastUpdate, safeInterval } from '../utils/scheduler.js';
import config from '../config.js';

const API_BASE = 'https://api.core.openaip.net/api/airspaces';
const WANTED_TYPES = [1, 2, 3]; // 1=Restricted, 2=Danger, 3=Prohibited
const TYPE_MAP = { 1: 'restricted', 2: 'danger', 3: 'prohibited' };
const PAGE_LIMIT = 1000;

async function fetchAirspaces() {
  console.log('[airspace] Fetching from OpenAIP API...');
  const apiKey = config.OPENAIP_API_KEY;
  if (!apiKey) {
    console.warn('[airspace] No OPENAIP_API_KEY configured, skipping');
    return;
  }

  try {
    let page = 1;
    let totalPages = 1;
    let count = 0;

    while (page <= totalPages) {
      const url = `${API_BASE}?type=${WANTED_TYPES.join(',')}&limit=${PAGE_LIMIT}&page=${page}&apiKey=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn('[airspace] fetch error:', res.status, 'page:', page);
        return;
      }

      const json = await res.json();
      totalPages = json.totalPages || 1;

      const BATCH = 50;
      let batch = [];

      for (const item of json.items) {
        const geom = item.geometry;
        if (!geom || geom.type !== 'Polygon' || !geom.coordinates?.[0]?.length) continue;

        const coords = geom.coordinates[0]; // outer ring [lon, lat]
        const wkt = 'POLYGON((' + coords.map(c => `${c[0]} ${c[1]}`).join(',') + '))';

        batch.push({
          id: `asp_${item._id}`,
          name: (item.name || '').substring(0, 200),
          category: TYPE_MAP[item.type] || 'restricted',
          country: (item.country || '').substring(0, 5),
          geom: db.raw(`ST_SetSRID(ST_GeomFromText(?), 4326)`, [wkt]),
          upper_limit_val: item.upperLimit?.value ?? null,
          lower_limit_val: item.lowerLimit?.value ?? null,
          meta: JSON.stringify({
            upperLimit: formatLimit(item.upperLimit),
            lowerLimit: formatLimit(item.lowerLimit),
          }),
          updated_at: new Date(),
        });

        if (batch.length >= BATCH) {
          await db('airspaces').insert(batch).onConflict('id').merge();
          count += batch.length;
          batch = [];
        }
      }

      if (batch.length > 0) {
        await db('airspaces').insert(batch).onConflict('id').merge();
        count += batch.length;
      }

      console.log(`[airspace] Page ${page}/${totalPages}, accumulated: ${count}`);
      page++;
    }

    await updateMeta('airspace', count);
    console.log('[airspace] Upserted', count, 'airspaces');
  } catch (e) {
    console.error('[airspace] error:', e.message);
  }
}

function formatLimit(limit) {
  if (!limit) return '';
  const UNIT_MAP = { 0: 'M', 1: 'FT', 6: 'FL' };
  const DATUM_MAP = { 0: 'GND', 1: 'MSL', 2: 'STD' };
  const unit = UNIT_MAP[limit.unit] || '';
  const datum = DATUM_MAP[limit.referenceDatum] || '';
  if (unit === 'FL') return `FL${limit.value}`;
  return `${limit.value} ${unit} ${datum}`.trim();
}

export function startAirspacePoller() {
  isTableEmpty('airspaces').then(empty => {
    if (empty) {
      fetchAirspaces();
    } else {
      getLastUpdate('airspace').then(last => {
        const age = last ? Date.now() - new Date(last).getTime() : Infinity;
        if (age > config.AIRSPACE_POLL_MS) fetchAirspaces();
      });
    }
  });

  safeInterval(fetchAirspaces, config.AIRSPACE_POLL_MS);
}
