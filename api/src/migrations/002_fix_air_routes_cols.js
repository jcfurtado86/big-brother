export async function up(knex) {
  await knex.raw('ALTER TABLE air_routes RENAME COLUMN src_icao TO src_iata');
  await knex.raw('ALTER TABLE air_routes RENAME COLUMN dst_icao TO dst_iata');
}

export async function down(knex) {
  await knex.raw('ALTER TABLE air_routes RENAME COLUMN src_iata TO src_icao');
  await knex.raw('ALTER TABLE air_routes RENAME COLUMN dst_iata TO dst_icao');
}
