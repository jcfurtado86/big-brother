export async function up(knex) {
  // Enable PostGIS
  await knex.raw('CREATE EXTENSION IF NOT EXISTS postgis');

  // Aircraft metadata (800K rows)
  await knex.schema.createTable('aircraft', (t) => {
    t.string('icao24', 6).primary();
    t.string('registration', 20);
    t.string('model', 100);
    t.string('manufacturer', 100);
    t.string('operator', 100);
    t.string('built', 4);
    t.string('type_code', 10);
    t.string('airline_iata', 3);
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Airports (40K rows)
  await knex.schema.createTable('airports', (t) => {
    t.increments('id').primary();
    t.string('ident', 10).unique();
    t.string('name', 200);
    t.string('type', 30);
    t.float('lat');
    t.float('lon');
    t.specificType('geom', 'GEOMETRY(Point, 4326)');
    t.integer('elevation');
    t.string('iso_country', 3);
    t.string('municipality', 100);
    t.string('iata_code', 4);
    t.string('icao_code', 4);
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
  await knex.raw('CREATE INDEX idx_airports_geom ON airports USING GIST(geom)');
  await knex.raw('CREATE INDEX idx_airports_type ON airports(type)');

  // ACLED events (900K rows)
  await knex.schema.createTable('acled_events', (t) => {
    t.increments('id').primary();
    t.string('event_id', 50);
    t.float('lat');
    t.float('lon');
    t.specificType('geom', 'GEOMETRY(Point, 4326)');
    t.string('category', 40);
    t.string('event_type', 60);
    t.string('sub_event_type', 80);
    t.string('actor1', 200);
    t.string('actor2', 200);
    t.string('country', 80);
    t.string('region', 80);
    t.string('location', 200);
    t.date('event_date');
    t.integer('events').defaultTo(1);
    t.integer('fatalities').defaultTo(0);
    t.text('notes');
    t.string('source', 200);
    t.string('iso_country', 5);
    t.string('disorder_type', 60);
    t.string('admin1', 100);
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
  await knex.raw('CREATE UNIQUE INDEX idx_acled_event_id ON acled_events(event_id)');
  await knex.raw('CREATE INDEX idx_acled_geom ON acled_events USING GIST(geom)');
  await knex.raw('CREATE INDEX idx_acled_category ON acled_events(category)');
  await knex.raw('CREATE INDEX idx_acled_date ON acled_events(event_date)');

  // Webcams (90K+ rows)
  await knex.schema.createTable('webcams', (t) => {
    t.string('id', 80).primary();
    t.float('lat');
    t.float('lon');
    t.specificType('geom', 'GEOMETRY(Point, 4326)');
    t.string('category', 20);
    t.string('title', 300);
    t.string('city', 100);
    t.string('region', 100);
    t.string('country', 100);
    t.string('country_code', 5);
    t.string('provider', 40);
    t.string('status', 20);
    t.string('player_url', 500);
    t.string('image_url', 500);
    t.string('stream_url', 500);
    t.string('thumbnail_url', 500);
    t.string('direction', 20);
    t.string('route', 100);
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
  await knex.raw('CREATE INDEX idx_webcams_geom ON webcams USING GIST(geom)');
  await knex.raw('CREATE INDEX idx_webcams_provider ON webcams(provider)');

  // Military installations (8K rows)
  await knex.schema.createTable('military_points', (t) => {
    t.increments('id').primary();
    t.bigInteger('osm_id').unique();
    t.float('lat');
    t.float('lon');
    t.specificType('geom', 'GEOMETRY(Point, 4326)');
    t.string('category', 40);
    t.string('name', 200);
    t.string('operator', 200);
    t.string('country', 5);
    t.jsonb('meta');
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
  await knex.raw('CREATE INDEX idx_military_geom ON military_points USING GIST(geom)');

  // ATC points (5K rows)
  await knex.schema.createTable('atc_points', (t) => {
    t.increments('id').primary();
    t.bigInteger('osm_id').unique();
    t.float('lat');
    t.float('lon');
    t.specificType('geom', 'GEOMETRY(Point, 4326)');
    t.string('category', 30);
    t.string('name', 200);
    t.string('operator', 200);
    t.string('icao', 10);
    t.string('frequency', 30);
    t.jsonb('meta');
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
  await knex.raw('CREATE INDEX idx_atc_geom ON atc_points USING GIST(geom)');

  // Nuclear plants (400 rows)
  await knex.schema.createTable('nuclear_plants', (t) => {
    t.string('id', 40).primary();
    t.float('lat');
    t.float('lon');
    t.specificType('geom', 'GEOMETRY(Point, 4326)');
    t.string('name', 200);
    t.string('country', 80);
    t.string('status', 40);
    t.jsonb('meta');
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
  await knex.raw('CREATE INDEX idx_nuclear_geom ON nuclear_plants USING GIST(geom)');

  // Telecom infrastructure (100K+ rows)
  await knex.schema.createTable('telecom_points', (t) => {
    t.string('id', 80).primary();
    t.float('lat');
    t.float('lon');
    t.specificType('geom', 'GEOMETRY(Point, 4326)');
    t.string('layer', 40);
    t.string('name', 200);
    t.string('operator', 200);
    t.jsonb('meta');
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
  await knex.raw('CREATE INDEX idx_telecom_geom ON telecom_points USING GIST(geom)');

  // Airspaces (10K polygons)
  await knex.schema.createTable('airspaces', (t) => {
    t.string('id', 40).primary();
    t.string('name', 200);
    t.string('category', 20);
    t.string('country', 5);
    t.specificType('geom', 'GEOMETRY(Polygon, 4326)');
    t.integer('upper_limit_val');
    t.integer('lower_limit_val');
    t.jsonb('meta');
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
  await knex.raw('CREATE INDEX idx_airspaces_geom ON airspaces USING GIST(geom)');

  // ADSB receivers (20K rows)
  await knex.schema.createTable('adsb_receivers', (t) => {
    t.string('id', 40).primary();
    t.float('lat');
    t.float('lon');
    t.specificType('geom', 'GEOMETRY(Point, 4326)');
    t.string('user_name', 100);
    t.string('region', 10);
    t.integer('peers').defaultTo(0);
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
  await knex.raw('CREATE INDEX idx_receivers_geom ON adsb_receivers USING GIST(geom)');

  // TLE data (single row, daily refresh)
  await knex.schema.createTable('tle_data', (t) => {
    t.string('id', 20).primary().defaultTo('active');
    t.text('tle_text');
    t.integer('sat_count');
    t.timestamp('fetched_at').defaultTo(knex.fn.now());
  });

  // Air routes
  await knex.schema.createTable('air_routes', (t) => {
    t.increments('id').primary();
    t.string('src_icao', 4);
    t.string('dst_icao', 4);
    t.specificType('geom', 'GEOMETRY(LineString, 4326)');
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
  await knex.raw('CREATE INDEX idx_air_routes_geom ON air_routes USING GIST(geom)');

  // Sea routes
  await knex.schema.createTable('sea_routes', (t) => {
    t.increments('id').primary();
    t.specificType('geom', 'GEOMETRY(LineString, 4326)');
    t.string('name', 200);
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
  await knex.raw('CREATE INDEX idx_sea_routes_geom ON sea_routes USING GIST(geom)');

  // Data source metadata tracking
  await knex.schema.createTable('data_source_meta', (t) => {
    t.string('source', 40).primary();
    t.timestamp('last_update');
    t.integer('record_count');
    t.string('status', 20).defaultTo('ok');
  });
}

export async function down(knex) {
  const tables = [
    'data_source_meta', 'sea_routes', 'air_routes', 'tle_data',
    'adsb_receivers', 'airspaces', 'telecom_points', 'nuclear_plants',
    'atc_points', 'military_points', 'webcams', 'acled_events',
    'airports', 'aircraft',
  ];
  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
}
