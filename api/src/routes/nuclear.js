import db from '../db.js';
import { parseBbox } from '../utils/spatial.js';

export default async function (app) {
  app.get('/nuclear', async (req, reply) => {
    let query = db('nuclear_plants').select(
      'id', 'lat', 'lon', 'name', 'country', 'status', 'meta'
    );

    const bbox = parseBbox(req.query);
    if (bbox) {
      query = query.whereRaw(bbox.clause, bbox.bindings);
    }

    const rows = await query;
    return rows;
  });
}
