import db from '../db.js';
import { parseBbox } from '../utils/spatial.js';

export default async function (app) {
  app.get('/acled', async (req, reply) => {
    const bbox = parseBbox(req.query);
    if (!bbox) {
      return reply.code(400).send({ error: 'bbox required (south, west, north, east)' });
    }

    let query = db('acled_events')
      .select('event_id', 'lat', 'lon', 'category', 'event_type', 'sub_event_type',
              'actor1', 'actor2', 'country', 'region', 'location', 'event_date',
              'events', 'fatalities', 'notes', 'source', 'iso_country',
              'disorder_type', 'admin1')
      .whereRaw(bbox.clause, bbox.bindings);

    const categories = req.query.categories;
    if (categories) {
      query = query.whereIn('category', categories.split(','));
    }

    // Date filter: absolute 'from' date, or relative 'period' (1d, 7d, 30d)
    const from = req.query.from; // YYYY-MM-DD
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
      query = query.where('event_date', '>=', from);
    } else {
      const period = req.query.period;
      if (period) {
        const days = parseInt(period, 10);
        if (!isNaN(days) && days > 0) {
          const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
          query = query.where('event_date', '>=', cutoff.toISOString().slice(0, 10));
        }
      }
    }

    query = query.limit(10000);
    return query;
  });
}
