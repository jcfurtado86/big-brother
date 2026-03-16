import db from '../db.js';
import { parseBbox } from '../utils/spatial.js';

export default async function (app) {
  app.get('/routes/air', async (req, reply) => {
    const bbox = parseBbox(req.query);

    let query = db('air_routes as r')
      .join('airports as src', 'src.iata_code', 'r.src_iata')
      .join('airports as dst', 'dst.iata_code', 'r.dst_iata')
      .select(
        'r.id',
        'r.src_iata',
        'r.dst_iata',
        'src.lat as src_lat',
        'src.lon as src_lon',
        'dst.lat as dst_lat',
        'dst.lon as dst_lon',
      );

    if (bbox) {
      // Route is visible if either endpoint is in the bbox
      query = query.whereRaw(
        `(ST_Within(src.geom, ST_MakeEnvelope(?, ?, ?, ?, 4326))
          OR ST_Within(dst.geom, ST_MakeEnvelope(?, ?, ?, ?, 4326)))`,
        [...bbox.bindings, ...bbox.bindings]
      );
    }

    const rows = await query;
    console.log(`[routes/air] returned ${rows.length} routes`);
    return rows;
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
