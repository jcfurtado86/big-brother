export async function up(knex) {
  await knex.schema.createTable('gdelt_events', (t) => {
    t.text('id').primary();
    t.timestamp('seen_at').notNullable().defaultTo(knex.fn.now());
    t.text('title');
    t.text('url');
    t.text('domain');
    t.text('socialimage');
    t.float('tone').defaultTo(0);
    t.text('tone_label').defaultTo('neutral');
    t.float('lat');
    t.float('lng');
    t.specificType('geom', 'GEOMETRY(Point, 4326)');
    t.text('country');
    t.text('event_type');
    t.timestamp('source_date');
  });

  await knex.raw('CREATE INDEX idx_gdelt_events_geom ON gdelt_events USING GIST(geom)');
  await knex.raw('CREATE INDEX idx_gdelt_events_seen ON gdelt_events(seen_at DESC)');
  await knex.raw('CREATE INDEX idx_gdelt_events_type ON gdelt_events(event_type)');
  await knex.raw('CREATE INDEX idx_gdelt_events_date ON gdelt_events(source_date DESC)');
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('gdelt_events');
}
