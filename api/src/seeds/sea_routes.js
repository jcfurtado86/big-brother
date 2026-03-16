import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', '..', '..', 'public', 'sea-routes.geojson');

export async function seed(knex) {
  const count = await knex('sea_routes').count('* as cnt').first();
  if (parseInt(count.cnt) > 0) {
    console.log('[seed/sea_routes] Table already populated, skipping');
    return;
  }

  console.log('[seed/sea_routes] Importing from sea-routes.geojson...');
  const raw = await readFile(DATA_PATH, 'utf-8');
  const geojson = JSON.parse(raw);

  const TYPE_MAP = { Major: 'major', Middle: 'middle', Minor: 'minor' };
  const BATCH = 50;
  let inserted = 0;
  let batch = [];

  for (const feature of geojson.features) {
    if (feature.geometry.type !== 'MultiLineString') continue;
    const name = TYPE_MAP[feature.properties?.Type] || 'minor';

    for (const line of feature.geometry.coordinates) {
      if (line.length < 2) continue;

      // Sample every 3rd point for smaller geometry, keep first and last
      const sampled = [];
      for (let i = 0; i < line.length; i += 3) sampled.push(line[i]);
      if (sampled[sampled.length - 1] !== line[line.length - 1]) {
        sampled.push(line[line.length - 1]);
      }

      const wkt = 'LINESTRING(' + sampled.map(c => `${c[0]} ${c[1]}`).join(',') + ')';

      batch.push({
        geom: knex.raw(`ST_SetSRID(ST_GeomFromText(?), 4326)`, [wkt]),
        name,
        updated_at: new Date(),
      });

      if (batch.length >= BATCH) {
        await knex('sea_routes').insert(batch);
        inserted += batch.length;
        batch = [];
      }
    }
  }

  if (batch.length > 0) {
    await knex('sea_routes').insert(batch);
    inserted += batch.length;
  }

  await knex('data_source_meta')
    .insert({ source: 'sea_routes', last_update: new Date(), record_count: inserted, status: 'ok' })
    .onConflict('source')
    .merge();

  console.log('[seed/sea_routes] Imported', inserted, 'sea route segments');
}
