import db from '../db.js';
import { parseBbox } from '../utils/spatial.js';

export default async function (app) {
  app.get('/airspace', async (req, reply) => {
    const bbox = parseBbox(req.query);
    if (!bbox) {
      return reply.code(400).send({ error: 'bbox required (south, west, north, east)' });
    }

    let query = db('airspaces')
      .select('id', 'name', 'category', 'country',
              'upper_limit_val', 'lower_limit_val', 'meta',
              db.raw('ST_AsGeoJSON(geom) as geojson'))
      .whereRaw(
        'ST_Intersects(geom, ST_MakeEnvelope(?, ?, ?, ?, 4326))',
        bbox.bindings
      );

    const categories = req.query.categories;
    if (categories) {
      query = query.whereIn('category', categories.split(','));
    }

    const rows = await query;
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      country: r.country,
      upperLimitVal: r.upper_limit_val,
      lowerLimitVal: r.lower_limit_val,
      meta: r.meta,
      coordinates: JSON.parse(r.geojson).coordinates[0],
    }));
  });
}
