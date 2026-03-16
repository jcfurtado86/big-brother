import config from '../config.js';
import { upsertFlights } from '../cache/flightCache.js';

const BASE_URL = 'https://api.airplanes.live/v2';

// ADS-B category string → numeric code (matches frontend mapping)
const CATEGORY_MAP = {
  A1: 1, A2: 2, A3: 3, A4: 4, A5: 5, A6: 6, A7: 7,
  B1: 8, B2: 9, B4: 10, B6: 11,
  C1: 14, C3: 15,
};

// Grid-based global polling: split globe into cells, fetch center of each
// ~45° cells give reasonable coverage with manageable request count
const GRID_STEP = 40; // degrees
const RADIUS = 250;   // NM (API max)

function buildGridCells() {
  const cells = [];
  for (let lat = -70; lat <= 70; lat += GRID_STEP) {
    for (let lon = -180; lon < 180; lon += GRID_STEP) {
      cells.push({
        lat: lat + GRID_STEP / 2,
        lon: lon + GRID_STEP / 2,
      });
    }
  }
  return cells;
}

const GRID_CELLS = buildGridCells();
let cellIndex = 0;

async function fetchCell(cell) {
  try {
    const url = `${BASE_URL}/point/${cell.lat}/${cell.lon}/${RADIUS}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });

    if (res.status === 429) {
      console.warn('[airplaneslive] rate limited');
      return [];
    }
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.ac) return [];

    const flights = [];
    for (const a of data.ac) {
      if (a.lat == null || a.lon == null) continue;

      const altFt = a.alt_baro !== 'ground' ? a.alt_baro : a.alt_geom;
      const altM = typeof altFt === 'number' ? altFt * 0.3048 : null;

      flights.push({
        icao24: a.hex,
        callsign: (a.flight || '').trim(),
        country: '',
        lat: a.lat,
        lon: a.lon,
        heading: a.track ?? null,
        velocity: typeof a.gs === 'number' ? a.gs * 0.5144 : null,
        altitude: altM,
        onGround: a.alt_baro === 'ground',
        category: CATEGORY_MAP[a.category] ?? 0,
        military: !!(a.dbFlags & 1),
        verticalRate: a.baro_rate ?? a.geom_rate ?? null,
        squawk: a.squawk || null,
        fetchedAt: Date.now(),
        _meta: a.r || a.t ? {
          registration: a.r || '',
          model: a.t || '',
          manufacturer: a.desc || '',
          operator: a.ownOp || '',
          built: a.year || '',
        } : null,
      });
    }
    return flights;
  } catch (e) {
    console.warn('[airplaneslive] fetch error:', e.message);
    return [];
  }
}

async function pollCycle() {
  // Fetch one grid cell per cycle to stay under rate limits
  const cell = GRID_CELLS[cellIndex % GRID_CELLS.length];
  cellIndex++;

  const flights = await fetchCell(cell);
  if (flights.length > 0) {
    upsertFlights('airplaneslive', flights);
  }

  const cellNum = ((cellIndex - 1) % GRID_CELLS.length) + 1;
  if (cellNum === GRID_CELLS.length) {
    console.log(`[airplaneslive] full grid cycle complete, ${GRID_CELLS.length} cells`);
  }
}

// On-demand fetch for a specific bbox (used by route handler)
export async function fetchBbox(south, west, north, east) {
  const lat = (south + north) / 2;
  const lon = (west + east) / 2;

  // Haversine-ish radius in NM
  const dlat = (north - south) / 2;
  const dlon = (east - west) / 2;
  const avgLat = lat * Math.PI / 180;
  const nmLat = dlat * 60;
  const nmLon = dlon * 60 * Math.cos(avgLat);
  const radius = Math.min(Math.ceil(Math.sqrt(nmLat ** 2 + nmLon ** 2)), 250);

  const flights = await fetchCell({ lat, lon, radius: radius || 250 });
  if (flights.length > 0) {
    upsertFlights('airplaneslive', flights);
  }
  return flights;
}

export function startAirplanesLivePoller() {
  // Stagger first fetch by 5s to let OpenSky go first
  setTimeout(() => {
    pollCycle();
    setInterval(pollCycle, config.AL_POLL_MS);
  }, 5_000);
}
