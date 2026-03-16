// OpenSky Network flight data provider.
// Fetches from Sentinela API server (which handles OAuth2 server-side).

import { API_URL } from '../../utils/api';
import { fetchAircraftMeta, fetchTrack } from '../flightUtils';

const POLL_INTERVAL = 60_000;

// ── Parse ────────────────────────────────────────────────────────────────────

function parseFlights(data) {
  const map = new Map();
  if (!Array.isArray(data)) return map;
  for (const f of data) {
    if (!f.lat || !f.lon) continue;
    map.set(f.icao24, {
      icao24:    f.icao24,
      callsign:  f.callsign || '',
      country:   f.country || '',
      lat:       f.lat,
      lon:       f.lon,
      heading:   f.heading ?? 0,
      velocity:  f.velocity ?? 0,
      altitude:  f.altitude ?? 0,
      category:  f.category ?? 0,
      fetchedAt: f.fetchedAt || Date.now(),
    });
  }
  return map;
}

// ── Provider interface ───────────────────────────────────────────────────────

export default {
  name: 'opensky',
  label: 'OpenSky Network',
  pollInterval: POLL_INTERVAL,

  global: true,

  async fetchFlights(_bbox = null, signal = undefined) {
    const timeout = AbortSignal.timeout(15_000);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    const res = await fetch(`${API_URL}/api/flights?provider=opensky`, { signal: combined });

    if (res.status === 429) { console.warn('[opensky] rate limited (429)'); return null; }
    if (!res.ok)            { console.warn('[opensky] API error', res.status); return null; }

    return parseFlights(await res.json());
  },

  fetchAircraftMeta,
  fetchTrack,
};
