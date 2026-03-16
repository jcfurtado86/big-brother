import db from '../db.js';
import { getFlights, getAllFlights, getStoreAge } from '../cache/flightCache.js';
import { fetchBbox } from '../pollers/airplaneslive.js';
import { parseBbox } from '../utils/spatial.js';

export default async function (app) {
  app.get('/flights', async (req, reply) => {
    const provider = req.query.provider; // 'opensky' | 'airplaneslive' | undefined (all)
    const bbox = parseBbox(req.query);

    // bindings order from parseBbox: [west, south, east, north]
    const bboxFilter = bbox ? {
      west: bbox.bindings[0],
      south: bbox.bindings[1],
      east: bbox.bindings[2],
      north: bbox.bindings[3],
    } : null;

    // For airplaneslive with bbox: if cache is stale (>15s), do a live fetch
    if (provider === 'airplaneslive' && bboxFilter) {
      const age = getStoreAge('airplaneslive');
      if (age > 15_000) {
        await fetchBbox(bboxFilter.south, bboxFilter.west, bboxFilter.north, bboxFilter.east);
      }
    }

    if (provider === 'opensky' || provider === 'airplaneslive') {
      return getFlights(provider, bboxFilter);
    }

    // No provider specified → merged view
    return getAllFlights(bboxFilter);
  });

  // GET /flights/history/:icao24?from=ISO&to=ISO
  // Returns position history for a specific aircraft
  app.get('/flights/history/:icao24', async (req, reply) => {
    const { icao24 } = req.params;
    const from = req.query.from;
    const to = req.query.to || new Date().toISOString();

    let query = db('flight_history')
      .select('lat', 'lon', 'altitude', 'heading', 'velocity',
              'vertical_rate', 'on_ground', 'callsign', 'squawk', 'recorded_at')
      .where('icao24', icao24)
      .orderBy('recorded_at', 'asc');

    if (from) query = query.where('recorded_at', '>=', from);
    query = query.where('recorded_at', '<=', to);

    return query.limit(5000);
  });

  // GET /timeline/coverage?from=ISO&to=ISO
  // Returns 5-min bucket timestamps that have historical data (lightweight, no positions)
  app.get('/timeline/coverage', async (req, reply) => {
    const from = req.query.from;
    const to = req.query.to;
    if (!from || !to) return reply.code(400).send({ error: 'from and to required' });

    const { rows } = await db.raw(`
      SELECT DISTINCT bucket FROM (
        SELECT date_trunc('hour', recorded_at)
          + INTERVAL '5 min' * FLOOR(EXTRACT(EPOCH FROM (recorded_at - date_trunc('hour', recorded_at))) / 300)
          AS bucket
        FROM flight_history WHERE recorded_at >= ? AND recorded_at <= ?
        UNION
        SELECT date_trunc('hour', recorded_at)
          + INTERVAL '5 min' * FLOOR(EXTRACT(EPOCH FROM (recorded_at - date_trunc('hour', recorded_at))) / 300)
          AS bucket
        FROM vessel_history WHERE recorded_at >= ? AND recorded_at <= ?
      ) sub ORDER BY bucket
    `, [from, to, from, to]);

    return rows.map(r => new Date(r.bucket).getTime());
  });

  // GET /flights/history/all?from=ISO&to=ISO
  // Returns all flight positions in a time range (for timeline sliding window)
  app.get('/flights/history/all', async (req, reply) => {
    const from = req.query.from;
    const to = req.query.to;
    if (!from || !to) return reply.code(400).send({ error: 'from and to required' });

    return db('flight_history')
      .select('icao24', 'callsign', 'lat', 'lon', 'altitude', 'heading',
              'velocity', 'vertical_rate', 'on_ground', 'squawk', 'category',
              'country', 'recorded_at')
      .where('recorded_at', '>=', from)
      .andWhere('recorded_at', '<=', to)
      .orderBy('recorded_at', 'asc')
      .limit(50000);
  });
}
