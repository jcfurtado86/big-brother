import config from '../config.js';
import { upsertFlights } from '../cache/flightCache.js';
import { withRetry } from '../utils/scheduler.js';

const AUTH_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
const STATES_URL = 'https://opensky-network.org/api/states/all';

let token = null;
let tokenExpiresAt = 0;

async function getToken() {
  if (token && Date.now() < tokenExpiresAt) return token;

  const id = config.OPENSKY_CLIENT_ID;
  const secret = config.OPENSKY_CLIENT_SECRET;
  if (!id || !secret) return null;

  try {
    const res = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: id,
        client_secret: secret,
      }),
    });

    if (!res.ok) {
      console.warn('[opensky] auth failed:', res.status);
      token = null;
      return null;
    }

    const data = await res.json();
    token = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return token;
  } catch (e) {
    console.warn('[opensky] auth error:', e.message);
    return null;
  }
}

async function fetchOpenSky() {
  console.log('[opensky] Fetching states...');

  await withRetry(async () => {
    const headers = {};
    const t = await getToken();
    if (t) headers['Authorization'] = `Bearer ${t}`;

    const res = await fetch(STATES_URL, {
      headers,
      signal: AbortSignal.timeout(30_000),
    });

    if (res.status === 429) {
      console.warn('[opensky] rate limited, skipping cycle');
      return; // don't retry on rate limit
    }
    if (res.status === 401) {
      token = null;
      tokenExpiresAt = 0;
      throw new Error('unauthorized, token invalidated');
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!data.states) {
      console.warn('[opensky] no states in response');
      return;
    }

    const flights = [];
    for (const s of data.states) {
      const lat = s[6];
      const lon = s[5];
      if (lat == null || lon == null) continue;

      flights.push({
        icao24: s[0],
        callsign: (s[1] || '').trim(),
        country: s[2] || '',
        lat,
        lon,
        altitude: s[7] ?? s[13] ?? null,
        onGround: !!s[8],
        velocity: s[9] ?? null,
        heading: s[10] ?? null,
        verticalRate: s[11] ?? null,
        category: s[17] ?? 0,
        fetchedAt: data.time * 1000,
      });
    }

    upsertFlights('opensky', flights);
    console.log(`[opensky] ${flights.length} aircraft cached`);
  }, { label: 'opensky', maxRetries: 3, delayMs: 10_000 });
}

export function startOpenSkyPoller() {
  fetchOpenSky();
  setInterval(fetchOpenSky, config.OPENSKY_POLL_MS);
}
