// Airplanes.live flight data provider.
// Implements the standard provider interface for the flight provider registry.

// ── Category mapping ─────────────────────────────────────────────────────────
// Airplanes.live uses ADS-B category strings (A1-A7, B1-B7, C1-C3).
// Map to numeric codes compatible with the existing planeIcons system.

function mapCategory(cat) {
  if (!cat) return 0;
  const table = {
    A1: 1, A2: 2, A3: 3, A4: 4, A5: 5, A6: 6, A7: 7,
    B1: 8, B2: 9, B4: 10, B6: 11,
    C1: 14, C3: 15,
  };
  return table[cat] ?? 0;
}

// ── Parse ────────────────────────────────────────────────────────────────────

const KN_TO_MS = 0.5144;
const FT_TO_M  = 0.3048;

function parseAirplanesLive(data) {
  const map = new Map();
  if (!data?.ac) return map;
  const now = Date.now();
  for (const a of data.ac) {
    if (!a.lat || !a.lon) continue;
    const onGround = a.alt_baro === 'ground';
    map.set(a.hex, {
      icao24:    a.hex,
      callsign:  (a.flight || '').trim(),
      country:   '',
      lat:       a.lat,
      lon:       a.lon,
      heading:   a.track ?? 0,
      velocity:  (a.gs ?? 0) * KN_TO_MS,
      altitude:  onGround ? 0 : (typeof a.alt_baro === 'number' ? a.alt_baro : (a.alt_geom ?? 0)) * FT_TO_M,
      category:  mapCategory(a.category),
      military:  !!(a.dbFlags & 1),
      fetchedAt: now,
      // Inline metadata — avoids separate /hex/ call
      _meta: (a.r || a.t || a.desc || a.ownOp || a.year) ? {
        registration: a.r    || null,
        model:        a.t    || null,
        manufacturer: a.desc || null,
        operator:     a.ownOp || null,
        built:        a.year || null,
      } : null,
    });
  }
  return map;
}

// ── bbox → point/radius conversion ──────────────────────────────────────────

const DEG_TO_RAD = Math.PI / 180;
const R_NM = 3440.065; // Earth radius in nautical miles

function haversineNm(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) *
    Math.sin(dLon / 2) ** 2;
  return 2 * R_NM * Math.asin(Math.sqrt(a));
}

function bboxToPointRadius(bbox) {
  const lat = (bbox.south + bbox.north) / 2;
  const lon = (bbox.west + bbox.east) / 2;
  const radius = Math.min(
    Math.ceil(haversineNm(lat, lon, bbox.north, bbox.east)),
    250
  );
  return { lat, lon, radius };
}

// ── Serialized rate limiter (1 req/s) ────────────────────────────────────────
// Queue-based: only one request in flight at a time, with MIN_GAP_MS between
// the *completion* of one request and the *start* of the next.

const MIN_GAP_MS = 1100;
let lastFinishedAt = 0;
let pending = Promise.resolve();

function throttledFetch(url, opts) {
  const job = pending.then(async () => {
    // Skip already-aborted requests — don't waste a queue slot or rate-limit budget
    if (opts?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const now = Date.now();
    const wait = Math.max(0, MIN_GAP_MS - (now - lastFinishedAt));
    if (wait > 0) {
      await new Promise(r => setTimeout(r, wait));
      if (opts?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    }
    try {
      return await fetch(url, opts);
    } finally {
      lastFinishedAt = Date.now();
    }
  });
  pending = job.catch(() => {});
  return job;
}

// ── Provider interface ───────────────────────────────────────────────────────

export default {
  name: 'airplaneslive',
  label: 'Airplanes.live',
  pollInterval: 10_000,
  retryInterval: 5_000,

  async fetchFlights(bbox = null, signal = undefined) {
    let url;
    if (bbox) {
      const { lat, lon, radius } = bboxToPointRadius(bbox);
      url = `/api/airplaneslive/point/${lat.toFixed(4)}/${lon.toFixed(4)}/${radius}`;
    } else {
      // No bbox → use max radius from 0,0 (best effort for global)
      url = '/api/airplaneslive/point/0/0/250';
    }

    try {
      const res = await throttledFetch(url, { signal });
      if (res.status === 429) { console.warn('[airplaneslive] rate limited (429)'); return null; }
      if (!res.ok)            { console.warn('[airplaneslive] API error', res.status); return null; }
      return parseAirplanesLive(await res.json());
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      console.warn('[airplaneslive] fetch error:', e.message);
      return null;
    }
  },

  async fetchAircraftMeta(icao24) {
    try {
      const res = await throttledFetch(`/api/airplaneslive/hex/${icao24}`);
      if (!res.ok) return null;
      const data = await res.json();
      const a = data?.ac?.[0];
      if (!a) return null;
      return {
        registration: a.r         || null,
        model:        a.t         || null,
        manufacturer: a.desc      || null,
        operator:     a.ownOp     || null,
        built:        a.year      || null,
      };
    } catch {
      return null;
    }
  },

  async fetchTrack(_icao24) {
    // Airplanes.live has no track history endpoint.
    // Track is built locally from accumulated poll positions.
    return null;
  },
};
