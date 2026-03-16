import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AIRPORTS_PATH = path.join(__dirname, '..', '..', '..', 'public', 'airports.json');
const ROUTES_PATH = path.join(__dirname, '..', '..', '..', 'public', 'air-routes.json');

export async function seed(knex) {
  const count = await knex('air_routes').count('* as cnt').first();
  if (parseInt(count.cnt) > 0) {
    console.log('[seed/air_routes] Table already populated, skipping');
    return;
  }

  console.log('[seed/air_routes] Importing from airports.json + air-routes.json...');

  const [airportsRaw, routesRaw] = await Promise.all([
    readFile(AIRPORTS_PATH, 'utf-8'),
    readFile(ROUTES_PATH, 'utf-8'),
  ]);

  const airports = JSON.parse(airportsRaw);
  const routePairs = JSON.parse(routesRaw);

  // Build IATA → { lat, lon } lookup
  const byIata = new Map();
  for (const a of airports) {
    if (a.iata && a.lat && a.lon) {
      byIata.set(a.iata, { lat: a.lat, lon: a.lon });
    }
  }

  const BATCH = 50;
  let inserted = 0;
  let batch = [];

  for (const [srcIata, dstIata] of routePairs) {
    const src = byIata.get(srcIata);
    const dst = byIata.get(dstIata);
    if (!src || !dst) continue;

    batch.push({
      src_iata: srcIata,
      dst_iata: dstIata,
      geom: knex.raw(
        `ST_SetSRID(ST_MakeLine(ST_MakePoint(?, ?), ST_MakePoint(?, ?)), 4326)`,
        [src.lon, src.lat, dst.lon, dst.lat]
      ),
      updated_at: new Date(),
    });

    if (batch.length >= BATCH) {
      await knex('air_routes').insert(batch);
      inserted += batch.length;
      batch = [];
    }
  }

  if (batch.length > 0) {
    await knex('air_routes').insert(batch);
    inserted += batch.length;
  }

  await knex('data_source_meta')
    .insert({ source: 'air_routes', last_update: new Date(), record_count: inserted, status: 'ok' })
    .onConflict('source')
    .merge();

  console.log('[seed/air_routes] Imported', inserted, 'air routes');
}
