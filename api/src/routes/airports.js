import db from '../db.js';
import { parseBbox } from '../utils/spatial.js';

export default async function (app) {
  app.get('/airports', async (req, reply) => {
    const bbox = parseBbox(req.query);
    if (!bbox) {
      return reply.code(400).send({ error: 'bbox required (south, west, north, east)' });
    }

    let query = db('airports')
      .select('ident', 'name', 'type', 'lat', 'lon', 'elevation',
              'iso_country', 'municipality', 'iata_code', 'icao_code')
      .whereRaw(bbox.clause, bbox.bindings);

    // Optional type filter
    const types = req.query.types;
    if (types) {
      query = query.whereIn('type', types.split(','));
    }

    const rows = await query;
    console.log(`[airports] bbox query returned ${rows.length} airports`);
    return rows;
  });
}
