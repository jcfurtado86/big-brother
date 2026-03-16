import db from '../db.js';
import { parseBbox } from '../utils/spatial.js';

export default async function (app) {
  app.get('/telecom', async (req, reply) => {
    const bbox = parseBbox(req.query);
    if (!bbox) {
      return reply.code(400).send({ error: 'bbox required (south, west, north, east)' });
    }

    let query = db('telecom_points')
      .select('id', 'lat', 'lon', 'layer', 'name', 'operator', 'meta')
      .whereRaw(bbox.clause, bbox.bindings);

    const layers = req.query.layers;
    if (layers) {
      query = query.whereIn('layer', layers.split(','));
    }

    query = query.limit(10000);
    return query;
  });
}
