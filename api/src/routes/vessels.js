import { getVessels, getVesselCount } from '../cache/vesselCache.js';
import { parseBbox } from '../utils/spatial.js';

export default async function (app) {
  // REST endpoint for snapshot of current vessels (alternative to WS)
  app.get('/vessels', async (req, reply) => {
    const bbox = parseBbox(req.query);

    const bboxFilter = bbox ? {
      west: bbox.bindings[0],
      south: bbox.bindings[1],
      east: bbox.bindings[2],
      north: bbox.bindings[3],
    } : null;

    return {
      count: getVesselCount(),
      vessels: getVessels(bboxFilter),
    };
  });
}
