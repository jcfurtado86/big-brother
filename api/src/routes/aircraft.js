import db from '../db.js';

// Simple LRU-ish cache for hot lookups
const cache = new Map();
const MAX_CACHE = 10_000;

export default async function (app) {
  // Single lookup
  app.get('/aircraft/:icao24', async (req, reply) => {
    const { icao24 } = req.params;
    const key = icao24.toLowerCase();

    if (cache.has(key)) return cache.get(key);

    const row = await db('aircraft').where({ icao24: key }).first();
    if (!row) return reply.code(404).send({ error: 'not found' });

    if (cache.size >= MAX_CACHE) {
      const first = cache.keys().next().value;
      cache.delete(first);
    }
    cache.set(key, row);
    return row;
  });

  // Batch lookup
  app.get('/aircraft', async (req, reply) => {
    const ids = req.query.icao24;
    if (!ids) return reply.code(400).send({ error: 'icao24 query param required' });

    const list = ids.split(',').map(s => s.trim().toLowerCase()).slice(0, 100);
    const rows = await db('aircraft').whereIn('icao24', list);
    return rows;
  });
}
