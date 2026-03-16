import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', '..', '..', 'src', 'data', 'nuclearPlants.json');

export async function seed(knex) {
  const count = await knex('nuclear_plants').count('* as cnt').first();
  if (parseInt(count.cnt) > 0) {
    console.log('[seed/nuclear] Table already populated, skipping');
    return;
  }

  console.log('[seed/nuclear] Importing from nuclearPlants.json...');
  const raw = await readFile(DATA_PATH, 'utf-8');
  const plants = JSON.parse(raw);

  const BATCH = 200;
  let inserted = 0;

  for (let i = 0; i < plants.length; i += BATCH) {
    const chunk = plants.slice(i, i + BATCH);
    const rows = chunk
      .filter(p => p.lat != null && p.lon != null)
      .map(p => ({
        id: p.id,
        lat: p.lat,
        lon: p.lon,
        geom: knex.raw(`ST_SetSRID(ST_MakePoint(${p.lon}, ${p.lat}), 4326)`),
        name: p.name || '',
        country: p.country || '',
        status: p.status || '',
        meta: JSON.stringify({
          countryCode: p.countryCode,
          reactorType: p.reactorType,
          reactorModel: p.reactorModel,
          capacity: p.capacity,
          constructionStart: p.constructionStart,
          operationalFrom: p.operationalFrom,
          operationalTo: p.operationalTo,
          iaeaId: p.iaeaId,
        }),
        updated_at: new Date(),
      }));

    await knex('nuclear_plants')
      .insert(rows)
      .onConflict('id')
      .merge();
    inserted += rows.length;
  }

  await knex('data_source_meta')
    .insert({ source: 'nuclear', last_update: new Date(), record_count: inserted, status: 'ok' })
    .onConflict('source')
    .merge();

  console.log('[seed/nuclear] Imported', inserted, 'nuclear plants');
}
