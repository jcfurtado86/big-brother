import db from '../db.js';
import { getVessels, getVesselCount } from '../cache/vesselCache.js';
import { parseBbox } from '../utils/spatial.js';

export default async function vesselsRoutes(app) {
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
  // Returns all vessel positions in a time range (for timeline sliding window)
  app.get('/vessels/history/all', async (req, reply) => {
    const from = req.query.from;
    const to = req.query.to;
    if (!from || !to) return reply.code(400).send({ error: 'from and to required' });

    return db('vessel_history')
      .select('mmsi', 'name', 'lat', 'lon', 'cog', 'sog', 'heading',
              db.raw('nav_status AS "navStatus"'),
              db.raw('ship_type AS "shipType"'),
              'country', 'recorded_at')
      .where('recorded_at', '>=', from)
      .andWhere('recorded_at', '<=', to)
      .orderBy('recorded_at', 'asc')
      .limit(50000);
  });

  // GET /vessels/check/:mmsi — check if vessel is sanctioned
  app.get('/vessels/check/:mmsi', async (req, reply) => {
    const { mmsi } = req.params;
    const rows = await db('sanctioned_vessels')
      .where('mmsi', mmsi)
      .orWhere('imo', mmsi)
      .select('sdn_name', 'program', 'flag', 'imo', 'mmsi');

    if (rows.length === 0) {
      return { sanctioned: false };
    }

    return {
      sanctioned: true,
      sdn_name: rows[0].sdn_name,
      programs: [...new Set(rows.map(r => r.program).filter(Boolean))],
      matches: rows,
    };
  });
}
