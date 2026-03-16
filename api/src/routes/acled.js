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

    query = query.limit(10000);
    return query;
  });
}
