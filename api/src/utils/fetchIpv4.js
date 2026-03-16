import https from 'node:https';
import http from 'node:http';

/**
 * fetch() replacement that forces IPv4 connections.
 * Node's native fetch (undici) ignores family setting, causing timeouts
 * on servers that are unreachable via IPv6 (Overpass API, adsb.lol, etc).
 */
export function fetchIpv4(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;

    const reqOpts = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: opts.method || 'GET',
      headers: opts.headers || {},
      family: 4,
      rejectUnauthorized: opts.rejectUnauthorized ?? true,
    };

    if (opts.signal) {
      opts.signal.addEventListener('abort', () => req.destroy());
    }

    const req = mod.request(reqOpts, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: () => JSON.parse(body.toString()),
          text: () => body.toString(),
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(opts.timeout || 120_000, () => {
      req.destroy(new Error('timeout'));
    });

    if (opts.body) req.write(opts.body);
    req.end();
  });
}
