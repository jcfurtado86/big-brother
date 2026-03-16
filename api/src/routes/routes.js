import db from '../db.js';
import { parseBbox } from '../utils/spatial.js';

export default async function (app) {
  app.get('/routes/air', async (req, reply) => {
    const bbox = parseBbox(req.query);

    let query = db('air_routes')
      .select('id', 'src_iata', 'dst_iata');

    if (bbox) {
      query = query.whereRaw(
        'ST_Intersects(geom, ST_MakeEnvelope(?, ?, ?, ?, 4326))',
        bbox.bindings
      );
    }

    query = query.limit(20000);
    return query;
  });

  app.get('/routes/sea', async (req, reply) => {
    const bbox = parseBbox(req.query);

    let query = db('sea_routes')
      .select('id', 'name',
              db.raw('ST_AsGeoJSON(geom) as geojson'));

    if (bbox) {
      query = query.whereRaw(
        'ST_Intersects(geom, ST_MakeEnvelope(?, ?, ?, ?, 4326))',
        bbox.bindings
      );
    }

    const rows = await query;
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      coordinates: JSON.parse(r.geojson).coordinates,
    }));
  });
}
