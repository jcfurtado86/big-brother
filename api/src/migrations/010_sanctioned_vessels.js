export async function up(knex) {
  await knex.schema.createTable('sanctioned_vessels', (t) => {
    t.increments('id');
    t.text('sdn_name').notNullable();
    t.text('vessel_type');
    t.text('tonnage');
    t.text('flag');
    t.string('imo', 20);
    t.string('mmsi', 12);
    t.text('program');
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_sv_mmsi ON sanctioned_vessels (mmsi)');
  await knex.raw('CREATE INDEX idx_sv_imo ON sanctioned_vessels (imo)');
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('sanctioned_vessels');
}
