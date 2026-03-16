import db from '../db.js';
import { parseCsvLine } from '../utils/csv.js';
import { updateMeta, isTableEmpty, getLastUpdate, safeInterval, withRetry } from '../utils/scheduler.js';
import config from '../config.js';

const CSV_URL = 'https://opensky-network.org/datasets/metadata/aircraftDatabase.csv';

async function fetchAircraftDb() {
  console.log('[aircraft] Fetching from OpenSky Network (~100MB)...');

  const count = await withRetry(async () => {
    const res = await fetch(CSV_URL, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const csv = await res.text();
    const lines = csv.split('\n');
    const header = parseCsvLine(lines[0]);
    const idx = Object.fromEntries(
      header.map((h, i) => [h.trim().replace(/^"|"$/g, ''), i])
    );

    const F = {
      icao24: idx['icao24'],
      registration: idx['registration'],
      manufacturer: idx['manufacturername'],
      model: idx['model'],
      operator: idx['operator'],
      built: idx['built'],
      typeCode: idx['typecode'],
      airlineIata: idx['operatoriata'],
    };

    let n = 0;
    const BATCH = 1000;
    let batch = new Map();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const f = parseCsvLine(line);
      const icao24 = (f[F.icao24] || '').trim().toLowerCase();
      if (!icao24 || icao24.length !== 6) continue;

      const reg = (f[F.registration] || '').trim().substring(0, 20);
      const model = (f[F.model] || '').trim().substring(0, 100);
      const mfr = (f[F.manufacturer] || '').trim().substring(0, 100);
      const op = (f[F.operator] || '').trim().substring(0, 100);
      const built = (f[F.built] || '').trim().substring(0, 4);
      const typeCode = (f[F.typeCode] || '').trim().toUpperCase().substring(0, 10);
      const airlineIata = (f[F.airlineIata] || '').trim().toUpperCase().substring(0, 3);

      if (!reg && !model && !mfr && !op && !typeCode && !airlineIata) continue;

      batch.set(icao24, {
        icao24,
        registration: reg,
        model,
        manufacturer: mfr,
        operator: op,
        built,
        type_code: typeCode,
        airline_iata: airlineIata,
        updated_at: new Date(),
      });

      if (batch.size >= BATCH) {
        await db('aircraft')
          .insert([...batch.values()])
          .onConflict('icao24')
          .merge(['registration', 'model', 'manufacturer', 'operator',
                  'built', 'type_code', 'airline_iata', 'updated_at']);
        n += batch.size;
        batch = new Map();
      }
    }

    if (batch.size > 0) {
      await db('aircraft')
        .insert([...batch.values()])
        .onConflict('icao24')
        .merge(['registration', 'model', 'manufacturer', 'operator',
                'built', 'type_code', 'airline_iata', 'updated_at']);
      n += batch.size;
    }

    return n;
  }, { label: 'aircraft', delayMs: 30_000 });

  if (count != null) {
    await updateMeta('aircraft', count);
    console.log('[aircraft] Upserted', count, 'aircraft');
  }
}

export function startAircraftPoller() {
  isTableEmpty('aircraft').then(empty => {
    if (empty) {
      fetchAircraftDb();
    } else {
      getLastUpdate('aircraft').then(last => {
        const age = last ? Date.now() - new Date(last).getTime() : Infinity;
        if (age > config.AIRCRAFT_POLL_MS) fetchAircraftDb();
      });
    }
  });

  safeInterval(fetchAircraftDb, config.AIRCRAFT_POLL_MS);
}
