import db from '../db.js';
import { getVessels, getVesselCount } from '../cache/vesselCache.js';
import { parseBbox } from '../utils/spatial.js';

export default async function (app) {
  // REST endpoint: current vessel positions (from in-memory cache)
  app.get('/vessels', async (req, reply) => {
    const bbox = parseBbox(req.query);

    const bboxFilter = bbox ? {
      west: bbox.bindings[0],
      south: bbox.bindings[1],
      east: bbox.bindings[2],
      north: bbox.bindings[3],
    } : null;

    return {
      count: getVesselCount(),
      vessels: getVessels(bboxFilter),
    };
  });

  // GET /vessels/history/:mmsi?from=ISO&to=ISO
  app.get('/vessels/history/:mmsi', async (req, reply) => {
    const { mmsi } = req.params;
    const from = req.query.from;
    const to = req.query.to || new Date().toISOString();

    let query = db('vessel_history')
      .select('lat', 'lon', 'cog', 'sog', 'heading',
              'nav_status as navStatus', 'ship_type as shipType',
              'name', 'recorded_at as recordedAt')
      .where('mmsi', mmsi)
      .orderBy('recorded_at', 'asc');

    if (from) query = query.where('recorded_at', '>=', from);
    query = query.where('recorded_at', '<=', to);

    return query.limit(5000);
  });

  // GET /vessels/history/all?from=ISO&to=ISO
  // Returns all vessel positions in a time range (for timeline replay)
  app.get('/vessels/history/all', async (req, reply) => {
    const from = req.query.from;
    const to = req.query.to;
    if (!from || !to) return reply.code(400).send({ error: 'from and to required' });

    // Sample: one point per entity per 5-minute bucket to keep payload manageable
    return db.raw(`
      SELECT DISTINCT ON (mmsi, bucket)
        mmsi, name, lat, lon, cog, sog, heading,
        nav_status AS "navStatus", ship_type AS "shipType",
        recorded_at,
        date_trunc('hour', recorded_at)
          + INTERVAL '5 min' * FLOOR(EXTRACT(EPOCH FROM (recorded_at - date_trunc('hour', recorded_at))) / 300)
          AS bucket
      FROM vessel_history
      WHERE recorded_at >= ? AND recorded_at <= ?
      ORDER BY mmsi, bucket, recorded_at DESC
    `, [from, to]).then(r => r.rows.map(({ bucket, ...rest }) => rest));
  });
}
