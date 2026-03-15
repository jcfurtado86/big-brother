// OpenSky Network flight data provider.
// Implements the standard provider interface for the flight provider registry.

import { openskyHeaders, invalidateToken, HAS_AUTH } from './openskyAuth';

const POLL_INTERVAL = HAS_AUTH
  ? Number(import.meta.env.VITE_POLL_INTERVAL_AUTH_MS ?? 60_000)
  : Number(import.meta.env.VITE_POLL_INTERVAL_ANON_MS ?? 60_000);

// ── Parse ────────────────────────────────────────────────────────────────────

function parseStates(data) {
  const map = new Map();
  if (!data?.states) return map;
  for (const s of data.states) {
    const icao24   = s[0];
    const lon      = s[5];
    const lat      = s[6];
    const heading  = s[10];
    const velocity = s[9];
    const altitude = s[7] ?? s[13] ?? 0;
    if (!lat || !lon) continue;
    map.set(icao24, {
      icao24,
      callsign:  (s[1] || '').trim(),
      country:   s[2]  || '',
      lat,
      lon,
      heading:   heading  ?? 0,
      velocity:  velocity ?? 0,
      altitude,
      category:  s[17] ?? 0,
      fetchedAt: Date.now(),
    });
  }
  return map;
}

function parseTrackPositions(data) {
  if (!data?.path?.length) return [];
  return data.path
    .filter(([, lat, lon]) => lat != null && lon != null)
    .map(([, lat, lon, baroAlt]) => ({
      lat,
      lon,
      alt: Math.max(baroAlt ?? 0, 500) + 2000,
    }));
}

// ── Provider interface ───────────────────────────────────────────────────────

export default {
  name: 'opensky',
  label: 'OpenSky Network',
  pollInterval: POLL_INTERVAL,

  global: true,

  async fetchFlights(_bbox = null, signal = undefined) {
    const headers = await openskyHeaders();
    const timeout = AbortSignal.timeout(15_000);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    const res = await fetch('/api/opensky', { headers, signal: combined });

    if (res.status === 429) { console.warn('[opensky] rate limited (429)'); return null; }
    if (res.status === 401) { console.warn('[opensky] unauthorized (401)'); invalidateToken(); return null; }
    if (!res.ok)            { console.warn('[opensky] API error', res.status); return null; }

    return parseStates(await res.json());
  },

  async fetchAircraftMeta(icao24) {
    const headers = await openskyHeaders();
    const res = await fetch(`/api/opensky-meta/${icao24}`, { headers });
    if (!res.ok) return null;
    const d = await res.json();
    return {
      registration: d.registration     || null,
      model:        d.model            || null,
      manufacturer: d.manufacturername || null,
      operator:     d.operator         || null,
      built:        d.built ? d.built.substring(0, 4) : null,
    };
  },

  async fetchTrack(icao24) {
    const headers = await openskyHeaders();
    const res = await fetch(`/api/opensky-track?icao24=${icao24}&time=0`, { headers });
    if (!res.ok) return null;
    return parseTrackPositions(await res.json());
  },
};
