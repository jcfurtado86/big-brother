import config from '../config.js';

const OWM_TILE_URL = 'https://tile.openweathermap.org/map';

// Simple in-memory tile cache
const tileCache = new Map();
const TILE_TTL_MS = 10 * 60_000; // 10 min

export default async function (app) {
  // Proxy OWM weather tiles
  app.get('/weather/tile/:layer/:z/:x/:y', async (req, reply) => {
    const { layer, z, x, y } = req.params;
    const key = `${layer}/${z}/${x}/${y}`;

    // Check cache
    const cached = tileCache.get(key);
    if (cached && Date.now() - cached.fetchedAt < TILE_TTL_MS) {
      reply.header('Content-Type', 'image/png');
      reply.header('Cache-Control', 'public, max-age=600');
      return reply.send(cached.data);
    }

    const apiKey = config.OWM_API_KEY;
    if (!apiKey) {
      return reply.code(503).send({ error: 'OWM API key not configured' });
    }

    try {
      const url = `${OWM_TILE_URL}/${layer}/${z}/${x}/${y}.png?appid=${apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });

      if (!res.ok) {
        return reply.code(res.status).send({ error: 'OWM tile fetch failed' });
      }

      const buffer = Buffer.from(await res.arrayBuffer());

      // Cache
      tileCache.set(key, { data: buffer, fetchedAt: Date.now() });

      // Evict old entries
      if (tileCache.size > 500) {
        const cutoff = Date.now() - TILE_TTL_MS;
        for (const [k, v] of tileCache) {
          if (v.fetchedAt < cutoff) tileCache.delete(k);
        }
      }

      reply.header('Content-Type', 'image/png');
      reply.header('Cache-Control', 'public, max-age=600');
      return reply.send(buffer);
    } catch (e) {
      return reply.code(502).send({ error: e.message });
    }
  });
}
