import db from '../db.js';
import { parseCsvLine } from '../utils/csv.js';
import { updateMeta, isTableEmpty, getLastUpdate, safeInterval, withRetry } from '../utils/scheduler.js';
import config from '../config.js';

const CSV_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';

const KEEP_TYPES = new Set([
  'large_airport', 'medium_airport', 'small_airport',
  'military', 'heliport', 'seaplane_base', 'balloonport',
]);

async function fetchAirports() {
  console.log('[airports] Fetching from OurAirports...');

  const count = await withRetry(async () => {
    const res = await fetch(CSV_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const csv = await res.text();
    const lines = csv.split('\n').filter(Boolean);
    const header = parseCsvLine(lines[0]);
    const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));

    let n = 0;
    const BATCH = 500;
    let batch = [];

    for (const line of lines.slice(1)) {
      if (!line.trim()) continue;
      const f = parseCsvLine(line);
      const type = f[idx.type];
      if (!KEEP_TYPES.has(type)) continue;

      const lat = parseFloat(f[idx.latitude_deg]);
      const lon = parseFloat(f[idx.longitude_deg]);
      if (isNaN(lat) || isNaN(lon)) continue;

      batch.push({
        ident: f[idx.ident] || '',
        name: f[idx.name] || '',
        type,
        lat,
        lon,
        geom: db.raw(`ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)`),
        elevation: parseInt(f[idx.elevation_ft]) || null,
        iso_country: f[idx.iso_country] || '',
        municipality: f[idx.municipality] || '',
        iata_code: f[idx.iata_code] || '',
        icao_code: f[idx.ident] || '',
        updated_at: new Date(),
      });

      if (batch.length >= BATCH) {
        await db('airports')
          .insert(batch)
          .onConflict('ident')
          .merge(['name', 'type', 'lat', 'lon', 'geom', 'elevation',
                  'iso_country', 'municipality', 'iata_code', 'updated_at']);
        n += batch.length;
        batch = [];
      }
    }

    if (batch.length > 0) {
      await db('airports')
        .insert(batch)
        .onConflict('ident')
        .merge(['name', 'type', 'lat', 'lon', 'geom', 'elevation',
                'iso_country', 'municipality', 'iata_code', 'updated_at']);
      n += batch.length;
    }

    return n;
  }, { label: 'airports' });

  if (count != null) {
    await updateMeta('airports', count);
    console.log('[airports] Upserted', count, 'airports');
  }
}

export function startAirportsPoller() {
  isTableEmpty('airports').then(empty => {
    if (empty) {
      fetchAirports();
    } else {
      getLastUpdate('airports').then(last => {
        const age = last ? Date.now() - new Date(last).getTime() : Infinity;
        if (age > config.AIRPORTS_POLL_MS) fetchAirports();
      });
    }
  });

  safeInterval(fetchAirports, config.AIRPORTS_POLL_MS);
}
