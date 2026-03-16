// Airplanes.live flight data provider.
// Fetches from Sentinela API server (which handles rate limiting and caching).

import { AL_POLL_MS, AL_RETRY_MS } from '../constants';
import { API_URL } from '../../utils/api';
import { fetchAircraftMeta, fetchTrack } from '../flightUtils';

// ── Parse ────────────────────────────────────────────────────────────────────

function parseFlights(data) {
  const map = new Map();
  if (!Array.isArray(data)) return map;
  const now = Date.now();
  for (const f of data) {
    if (!f.lat || !f.lon) continue;
    map.set(f.icao24, {
      icao24:       f.icao24,
      callsign:     f.callsign || '',
      country:      f.country || '',
      lat:          f.lat,
      lon:          f.lon,
      heading:      f.heading ?? 0,
      velocity:     f.velocity ?? 0,
      altitude:     f.altitude ?? 0,
      category:     f.category ?? 0,
      military:     f.military ?? false,
      verticalRate: f.verticalRate ?? null,
      squawk:       f.squawk || null,
      fetchedAt:    f.fetchedAt || now,
      _meta:        f._meta || null,
    });
  }
  return map;
}

// ── Provider interface ───────────────────────────────────────────────────────

export default {
  name: 'airplaneslive',
  label: 'Airplanes.live',
  pollInterval: AL_POLL_MS,
  retryInterval: AL_RETRY_MS,

  async fetchFlights(bbox = null, signal = undefined) {
    let url = `${API_URL}/api/flights?provider=airplaneslive`;
    if (bbox) {
      url += `&bbox=${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
    }

    try {
      const res = await fetch(url, { signal });
      if (res.status === 429) { console.warn('[airplaneslive] rate limited (429)'); return null; }
      if (!res.ok)            { console.warn('[airplaneslive] API error', res.status); return null; }
      return parseFlights(await res.json());
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      console.warn('[airplaneslive] fetch error:', e.message);
      return null;
    }
  },

  fetchAircraftMeta,
  fetchTrack,
};
