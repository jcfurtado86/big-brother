import db from '../db.js';
import { parseBbox } from '../utils/spatial.js';

export default async function (app) {
  app.get('/atc', async (req, reply) => {
    const bbox = parseBbox(req.query);
    if (!bbox) {
      return reply.code(400).send({ error: 'bbox required (south, west, north, east)' });
    }

    let query = db('atc_points')
      .select('osm_id', 'lat', 'lon', 'category', 'name', 'operator',
              'icao', 'frequency', 'meta')
      .whereRaw(bbox.clause, bbox.bindings);

    const categories = req.query.categories;
    if (categories) {
      query = query.whereIn('category', categories.split(','));
    }

    return query;
  });
}
