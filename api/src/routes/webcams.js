import db from '../db.js';
import { parseBbox } from '../utils/spatial.js';

export default async function (app) {
  app.get('/webcams', async (req, reply) => {
    const bbox = parseBbox(req.query);
    if (!bbox) {
      return reply.code(400).send({ error: 'bbox required (south, west, north, east)' });
    }

    let query = db('webcams')
      .select('id', 'lat', 'lon', 'category', 'title', 'city', 'region',
              'country', 'country_code', 'provider', 'status',
              'player_url', 'image_url', 'stream_url', 'thumbnail_url',
              'direction', 'route')
      .whereRaw(bbox.clause, bbox.bindings);

    const providers = req.query.providers;
    if (providers) {
      query = query.whereIn('provider', providers.split(','));
    }

    const categories = req.query.categories;
    if (categories) {
      query = query.whereIn('category', categories.split(','));
    }

    query = query.limit(5000);
    return query;
  });
}
