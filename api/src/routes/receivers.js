import db from '../db.js';
import { parseBbox } from '../utils/spatial.js';

export default async function (app) {
  app.get('/receivers', async (req, reply) => {
    const bbox = parseBbox(req.query);
    if (!bbox) {
      return reply.code(400).send({ error: 'bbox required (south, west, north, east)' });
    }

    return db('adsb_receivers')
      .select('id', 'lat', 'lon', 'user_name', 'region', 'peers')
      .whereRaw(bbox.clause, bbox.bindings);
  });
}
