import { getTle } from '../cache/tleCache.js';

export default async function (app) {
  app.get('/tle', async (req, reply) => {
    const { tleText, satCount, fetchedAt } = getTle();

    if (!tleText) {
      return reply.code(503).send({ error: 'TLE data not yet available' });
    }

    // Conditional request support
    if (fetchedAt) {
      reply.header('Last-Modified', fetchedAt.toUTCString());
      const ifModified = req.headers['if-modified-since'];
      if (ifModified && new Date(ifModified) >= fetchedAt) {
        return reply.code(304).send();
      }
    }

    return reply
      .header('Content-Type', 'text/plain')
      .header('X-Satellite-Count', satCount)
      .send(tleText);
  });
}
