// Simple in-memory cache: IP → result
const cache = new Map();
const CACHE_TTL_MS = 60 * 60_000; // 1 hour

export default async function (app) {
  app.get('/geoip', async (req, reply) => {
    const clientIp = req.ip;

    // Check cache
    const cached = cache.get(clientIp);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const res = await fetch('http://ip-api.com/json/', {
        signal: AbortSignal.timeout(5_000),
      });

      if (!res.ok) {
        return reply.code(502).send({ error: 'GeoIP lookup failed' });
      }

      const data = await res.json();

      // Cache it
      cache.set(clientIp, { data, fetchedAt: Date.now() });

      // Evict old entries
      if (cache.size > 1000) {
        const cutoff = Date.now() - CACHE_TTL_MS;
        for (const [k, v] of cache) {
          if (v.fetchedAt < cutoff) cache.delete(k);
        }
      }

      return data;
    } catch (e) {
      return reply.code(502).send({ error: e.message });
    }
  });
}
