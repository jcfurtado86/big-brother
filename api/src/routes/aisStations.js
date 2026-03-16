import db from '../db.js';
import { parseBbox } from '../utils/spatial.js';

export default async function (app) {
  app.get('/ais-stations', async (req, reply) => {
    const bbox = parseBbox(req.query);

    let query = db('ais_stations')
      .select('mmsi', 'lat', 'lon', 'name', 'country', 'updated_at');

    if (bbox) {
      query = query.whereRaw(bbox.clause, bbox.bindings);
    }

    return query;
  });
}
