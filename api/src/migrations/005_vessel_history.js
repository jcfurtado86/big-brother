export async function up(knex) {
  await knex.raw(`
    CREATE TABLE vessel_history (
      id          BIGSERIAL PRIMARY KEY,
      mmsi        VARCHAR(12) NOT NULL,
      name        VARCHAR(100),
      lat         DOUBLE PRECISION NOT NULL,
      lon         DOUBLE PRECISION NOT NULL,
      cog         DOUBLE PRECISION,
      sog         DOUBLE PRECISION,
      heading     DOUBLE PRECISION,
      nav_status  SMALLINT,
      ship_type   SMALLINT,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_vh_mmsi_time ON vessel_history (mmsi, recorded_at DESC);
    CREATE INDEX idx_vh_recorded_at ON vessel_history (recorded_at);
  `);
}

export async function down(knex) {
  await knex.raw('DROP TABLE IF EXISTS vessel_history');
}
