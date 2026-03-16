export async function up(knex) {
  await knex.raw(`
    CREATE TABLE flight_history (
      id          BIGSERIAL PRIMARY KEY,
      icao24      VARCHAR(6) NOT NULL,
      callsign    VARCHAR(10),
      lat         DOUBLE PRECISION NOT NULL,
      lon         DOUBLE PRECISION NOT NULL,
      altitude    DOUBLE PRECISION,
      heading     DOUBLE PRECISION,
      velocity    DOUBLE PRECISION,
      vertical_rate DOUBLE PRECISION,
      on_ground   BOOLEAN DEFAULT FALSE,
      squawk      VARCHAR(4),
      category    SMALLINT DEFAULT 0,
      provider    VARCHAR(20),
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Primary query pattern: "show me flight X over time range"
    CREATE INDEX idx_fh_icao24_time ON flight_history (icao24, recorded_at DESC);

    -- For cleanup jobs: DELETE WHERE recorded_at < cutoff
    CREATE INDEX idx_fh_recorded_at ON flight_history (recorded_at);

    -- For spatial replay: "what flew over this area on date X"
    -- (optional, add later if needed)
    -- CREATE INDEX idx_fh_geom ON flight_history USING GIST (ST_SetSRID(ST_MakePoint(lon, lat), 4326));
  `);
}

export async function down(knex) {
  await knex.raw('DROP TABLE IF EXISTS flight_history');
}
