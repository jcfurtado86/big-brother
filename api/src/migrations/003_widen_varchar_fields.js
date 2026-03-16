export async function up(knex) {
  // Airport ident and icao_code can be longer than 4 chars (e.g. "AD-0001")
  await knex.raw('ALTER TABLE airports ALTER COLUMN ident TYPE VARCHAR(20)');
  await knex.raw('ALTER TABLE airports ALTER COLUMN icao_code TYPE VARCHAR(10)');
  await knex.raw('ALTER TABLE airports ALTER COLUMN iata_code TYPE VARCHAR(10)');
  await knex.raw('ALTER TABLE airports ALTER COLUMN name TYPE VARCHAR(300)');
  await knex.raw('ALTER TABLE airports ALTER COLUMN municipality TYPE VARCHAR(200)');
}

export async function down(knex) {
  await knex.raw('ALTER TABLE airports ALTER COLUMN ident TYPE VARCHAR(10)');
  await knex.raw('ALTER TABLE airports ALTER COLUMN icao_code TYPE VARCHAR(4)');
  await knex.raw('ALTER TABLE airports ALTER COLUMN iata_code TYPE VARCHAR(4)');
  await knex.raw('ALTER TABLE airports ALTER COLUMN name TYPE VARCHAR(200)');
  await knex.raw('ALTER TABLE airports ALTER COLUMN municipality TYPE VARCHAR(100)');
}
