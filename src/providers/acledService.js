import { idbGet, idbSet } from '../utils/idbCache';
import { ACLED_TTL_MS } from './constants';

const IDB_STORE = 'acled';
const IDB_KEY = 'global';
const CSV_DIR = '/data/acled/';
// Manifest of regional CSV files — add/remove as needed
const CSV_FILES = [
  'africa.csv',
  'middle-east.csv',
  'south-asia.csv',
  'europe.csv',
  'latin-america.csv',
  'united-states-canada.csv',
];

// Map ACLED event_type to our internal category keys
const TYPE_MAP = {
  'Battles':                      'battles',
  'Explosions/Remote violence':   'explosions_remote_violence',
  'Violence against civilians':   'violence_against_civilians',
  'Protests':                     'protests',
  'Riots':                        'riots',
  'Strategic developments':       'strategic_developments',
};

let globalCache = null;
let globalCacheTs = 0;

/**
 * Parse a CSV string handling quoted fields with commas and newlines.
 * Returns array of objects keyed by header row.
 */
function parseCSV(text) {
  const rows = [];
  let i = 0;
  const len = text.length;

  function readField() {
    if (i >= len) return '';
    if (text[i] === '"') {
      i++; // skip opening quote
      let field = '';
      while (i < len) {
        if (text[i] === '"') {
          if (i + 1 < len && text[i + 1] === '"') {
            field += '"';
            i += 2;
          } else {
            i++; // skip closing quote
            break;
          }
        } else {
          field += text[i++];
        }
      }
      return field;
    }
    // unquoted — slice instead of char-by-char concat
    const start = i;
    while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') i++;
    return text.slice(start, i);
  }

  function readRow() {
    const fields = [];
    while (i < len) {
      fields.push(readField());
      if (i >= len || text[i] === '\n' || text[i] === '\r') {
        // consume line ending
        if (i < len && text[i] === '\r') i++;
        if (i < len && text[i] === '\n') i++;
        break;
      }
      if (text[i] === ',') i++; // skip comma
    }
    return fields;
  }

  const headers = readRow();
  while (i < len) {
    const fields = readRow();
    if (fields.length < 2) continue; // skip empty lines
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = fields[j] ?? '';
    }
    rows.push(obj);
  }
  return rows;
}

/**
 * Resolve a column value trying multiple possible header names.
 * The ACLED aggregated CSVs have varying header formats.
 */
function col(ev, ...keys) {
  for (const k of keys) {
    if (ev[k] != null && ev[k] !== '') return ev[k];
  }
  return '';
}

function parseRows(rows) {
  const points = [];
  let autoId = 0;

  for (const ev of rows) {
    // Try both formats: aggregated (EVENT_TYPE) and event-level (event_type)
    const rawType = col(ev, 'EVENT_TYPE', 'event_type');
    const category = TYPE_MAP[rawType];
    if (!category) continue;

    // Aggregated CSVs use CENTROID_LATITUDE/LONGITUDE, event-level uses latitude/longitude
    const lat = parseFloat(col(ev, 'CENTROID_LATITUDE', 'LATITUDE', 'latitude'));
    const lon = parseFloat(col(ev, 'CENTROID_LONGITUDE', 'LONGITUDE', 'longitude'));
    if (isNaN(lat) || isNaN(lon)) continue;

    const id = col(ev, 'event_id_cnty', 'ID') || String(autoId);
    const events = parseInt(col(ev, 'EVENTS', 'events')) || 1;
    const fatalities = parseInt(col(ev, 'FATALITIES', 'fatalities')) || 0;
    autoId++;

    points.push({
      id: `acled_${id}_${autoId}`,
      lat,
      lon,
      category,
      eventType:    rawType,
      subEventType: col(ev, 'SUB_EVENT_TYPE', 'sub_event_type'),
      actor1:       col(ev, 'actor1'),
      actor2:       col(ev, 'actor2'),
      country:      col(ev, 'COUNTRY', 'country'),
      region:       col(ev, 'REGION', 'region'),
      location:     col(ev, 'location') || col(ev, 'ADMIN1', 'admin1'),
      date:         col(ev, 'WEEK', 'event_date'),
      events,
      fatalities,
      notes:        col(ev, 'notes'),
      source:       col(ev, 'source'),
      sourceScale:  col(ev, 'source_scale'),
      admin1:       col(ev, 'ADMIN1', 'admin1'),
      admin2:       col(ev, 'admin2'),
      admin3:       col(ev, 'admin3'),
      disorderType: col(ev, 'DISORDER_TYPE', 'disorder_type'),
      isoCountry:   String(col(ev, 'iso', 'ISO') || ''),
    });
  }
  return points;
}

export async function fetchAllAcled(signal) {
  if (globalCache && (Date.now() - globalCacheTs) < ACLED_TTL_MS) return globalCache;

  const cached = await idbGet(IDB_STORE, IDB_KEY);
  if (cached && cached.data?.length > 0 && (Date.now() - cached.ts) < ACLED_TTL_MS) {
    console.log('[ACLED] IDB cache:', cached.data.length, 'eventos');
    globalCache = cached.data;
    globalCacheTs = cached.ts;
    return globalCache;
  }

  console.log('[ACLED] Carregando CSVs regionais...');

  try {
    // Fetch all regional files in parallel, ignore missing ones
    const results = await Promise.all(
      CSV_FILES.map(async (file) => {
        try {
          const res = await fetch(`${CSV_DIR}${file}`, { signal });
          if (!res.ok) return null;
          const text = await res.text();
          return { file, rows: parseCSV(text) };
        } catch (e) {
          if (e.name === 'AbortError') throw e;
          return null;
        }
      })
    );

    const allPoints = [];
    const loaded = [];
    for (const result of results) {
      if (!result) continue;
      const pts = parseRows(result.rows);
      loaded.push(`${result.file}(${pts.length})`);
      for (const p of pts) allPoints.push(p);
    }

    if (allPoints.length === 0) {
      console.warn('[ACLED] Nenhum CSV encontrado em', CSV_DIR, '- coloque os arquivos regionais la');
      return [];
    }

    const cats = {};
    for (const p of allPoints) cats[p.category] = (cats[p.category] || 0) + 1;
    console.log(`[ACLED] ${loaded.length} arquivos, ${allPoints.length} eventos:`, loaded.join(', '));
    console.log('[ACLED] Categorias:', cats);

    globalCache = allPoints;
    globalCacheTs = Date.now();
    idbSet(IDB_STORE, IDB_KEY, { ts: globalCacheTs, data: allPoints });
    return allPoints;
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    console.warn('[ACLED] Erro ao carregar CSVs:', e.message);
    return [];
  }
}
