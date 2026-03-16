export async function up(knex) {
  await knex.raw(`
    CREATE TABLE ais_stations (
      mmsi        VARCHAR(12) PRIMARY KEY,
      lat         DOUBLE PRECISION NOT NULL,
      lon         DOUBLE PRECISION NOT NULL,
      geom        GEOMETRY(Point, 4326),
      name        VARCHAR(100),
      country     VARCHAR(50),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX idx_ais_stations_geom ON ais_stations USING GIST(geom);
  `);
}

export async function down(knex) {
  await knex.raw('DROP TABLE IF EXISTS ais_stations');
}
