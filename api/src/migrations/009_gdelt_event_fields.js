export async function up(knex) {
  await knex.schema.alterTable('gdelt_events', (t) => {
    t.float('goldstein_scale').nullable();
    t.integer('quad_class').nullable();
    t.text('event_code').nullable();
    t.text('actor1_name').nullable();
    t.text('actor2_name').nullable();
    t.text('action_geo_name').nullable();
    t.text('source_url').nullable();
  });
}

export async function down(knex) {
  await knex.schema.alterTable('gdelt_events', (t) => {
    t.dropColumn('goldstein_scale');
    t.dropColumn('quad_class');
    t.dropColumn('event_code');
    t.dropColumn('actor1_name');
    t.dropColumn('actor2_name');
    t.dropColumn('action_geo_name');
    t.dropColumn('source_url');
  });
}
