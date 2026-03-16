import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../db.js';
import { updateMeta, isTableEmpty, getLastUpdate, safeInterval } from '../utils/scheduler.js';
import config from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_DIR = path.join(__dirname, '..', '..', '..', 'public', 'data', 'acled');

const CSV_FILES = [
  'africa.csv',
  'middle-east.csv',
  'south-asia.csv',
  'europe.csv',
  'latin-america.csv',
  'united-states-canada.csv',
];

const TYPE_MAP = {
  'Battles':                      'battles',
  'Explosions/Remote violence':   'explosions_remote_violence',
  'Violence against civilians':   'violence_against_civilians',
  'Protests':                     'protests',
  'Riots':                        'riots',
  'Strategic developments':       'strategic_developments',
};

function parseCSV(text) {
  const rows = [];
  let i = 0;
  const len = text.length;

  function readField() {
    if (i >= len) return '';
    if (text[i] === '"') {
      i++;
      let field = '';
      while (i < len) {
        if (text[i] === '"') {
          if (i + 1 < len && text[i + 1] === '"') { field += '"'; i += 2; }
          else { i++; break; }
        } else { field += text[i++]; }
      }
      return field;
    }
    const start = i;
    while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') i++;
    return text.slice(start, i);
  }

  function readRow() {
    const fields = [];
    while (i < len) {
      fields.push(readField());
      if (i >= len || text[i] === '\n' || text[i] === '\r') {
        if (i < len && text[i] === '\r') i++;
        if (i < len && text[i] === '\n') i++;
        break;
      }
      if (text[i] === ',') i++;
    }
    return fields;
  }

  const headers = readRow();
  while (i < len) {
    const fields = readRow();
    if (fields.length < 2) continue;
    const obj = {};
    for (let j = 0; j < headers.length; j++) obj[headers[j]] = fields[j] ?? '';
    rows.push(obj);
  }
  return rows;
}

function col(ev, ...keys) {
  for (const k of keys) {
    if (ev[k] != null && ev[k] !== '') return ev[k];
  }
  return '';
}

async function fetchAcled() {
  console.log('[acled] Importing from CSV files...');
  try {
    // Get last update date for incremental import
    const lastUpdate = await getLastUpdate('acled');
    let totalInserted = 0;

    const seenIds = new Set();

    for (const file of CSV_FILES) {
      let text;
      try {
        text = await readFile(path.join(CSV_DIR, file), 'utf-8');
      } catch {
        continue; // file not found, skip
      }

      const rows = parseCSV(text);
      const BATCH = 200;
      let batch = [];

      for (const ev of rows) {
        const rawType = col(ev, 'EVENT_TYPE', 'event_type');
        const category = TYPE_MAP[rawType];
        if (!category) continue;

        const lat = parseFloat(col(ev, 'CENTROID_LATITUDE', 'LATITUDE', 'latitude'));
        const lon = parseFloat(col(ev, 'CENTROID_LONGITUDE', 'LONGITUDE', 'longitude'));
        if (isNaN(lat) || isNaN(lon)) continue;

        const dateStr = col(ev, 'WEEK', 'event_date');
        const eventDate = dateStr ? new Date(dateStr) : null;

        // Incremental: skip events older than last update
        if (lastUpdate && eventDate && eventDate <= new Date(lastUpdate)) continue;

        const eventId = col(ev, 'event_id_cnty', 'ID') || null;
        if (!eventId) continue; // skip rows without event_id

        // Deduplicate across all files
        if (seenIds.has(eventId)) continue;
        seenIds.add(eventId);

        batch.push({
          event_id: eventId,
          lat,
          lon,
          geom: db.raw(`ST_SetSRID(ST_MakePoint(?, ?), 4326)`, [lon, lat]),
          category,
          event_type: rawType,
          sub_event_type: col(ev, 'SUB_EVENT_TYPE', 'sub_event_type'),
          actor1: col(ev, 'actor1').substring(0, 200),
          actor2: col(ev, 'actor2').substring(0, 200),
          country: col(ev, 'COUNTRY', 'country'),
          region: col(ev, 'REGION', 'region'),
          location: (col(ev, 'location') || col(ev, 'ADMIN1', 'admin1')).substring(0, 200),
          event_date: eventDate,
          events: parseInt(col(ev, 'EVENTS', 'events')) || 1,
          fatalities: parseInt(col(ev, 'FATALITIES', 'fatalities')) || 0,
          notes: col(ev, 'notes'),
          source: col(ev, 'source').substring(0, 200),
          iso_country: String(col(ev, 'iso', 'ISO') || '').substring(0, 5),
          disorder_type: col(ev, 'DISORDER_TYPE', 'disorder_type'),
          admin1: col(ev, 'ADMIN1', 'admin1'),
          updated_at: new Date(),
        });

        if (batch.length >= BATCH) {
          await db('acled_events').insert(batch).onConflict('event_id').merge();
          totalInserted += batch.length;
          batch = [];
        }
      }

      if (batch.length > 0) {
        await db('acled_events').insert(batch).onConflict('event_id').merge();
        totalInserted += batch.length;
      }
    }

    await updateMeta('acled', totalInserted);
    console.log('[acled] Upserted', totalInserted, 'events');
  } catch (e) {
    console.error('[acled] error:', e.message);
  }
}

export function startAcledPoller() {
  isTableEmpty('acled_events').then(empty => {
    if (empty) {
      fetchAcled();
    } else {
      getLastUpdate('acled').then(last => {
        const age = last ? Date.now() - new Date(last).getTime() : Infinity;
        if (age > config.ACLED_POLL_MS) fetchAcled();
      });
    }
  });

  safeInterval(fetchAcled, config.ACLED_POLL_MS);
}
