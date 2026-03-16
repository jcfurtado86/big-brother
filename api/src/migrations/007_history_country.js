export async function up(knex) {
  await knex.schema.alterTable('flight_history', t => {
    t.string('country', 80).nullable();
  });
  await knex.schema.alterTable('vessel_history', t => {
    t.string('country', 80).nullable();
  });
}

export async function down(knex) {
  await knex.schema.alterTable('flight_history', t => {
    t.dropColumn('country');
  });
  await knex.schema.alterTable('vessel_history', t => {
    t.dropColumn('country');
  });
}
