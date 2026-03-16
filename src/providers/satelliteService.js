import { twoline2satrec, propagate, gstime, eciToGeodetic, degreesLong, degreesLat } from 'satellite.js';
import { idbGet, idbSet } from '../utils/idbCache';
import { API_URL } from '../utils/api';

function parseTLEs(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  const sats = new Map();
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name  = lines[i];
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];
    if (!line1.startsWith('1') || !line2.startsWith('2')) continue;
    const noradId = line1.substring(2, 7).trim();
    sats.set(noradId, { noradId, name, line1, line2 });
  }
  return sats;
}

export async function fetchTLEs(signal, cacheTtlMs) {
  const cached = await idbGet('tle', 'active');
  if (cached && Date.now() - cached.fetchedAt < cacheTtlMs) {
    console.log('[satellites] using cached TLEs —', cached.count, 'sats');
    return parseTLEs(cached.text);
  }

  console.log('[satellites] fetching TLEs from API…');

  const res = await fetch(`${API_URL}/api/tle`, { signal });
  if (!res.ok) throw new Error(`TLE API ${res.status}`);
  const text = await res.text();
  const sats = parseTLEs(text);

  await idbSet('tle', 'active', { text, fetchedAt: Date.now(), count: sats.size });
  console.log('[satellites] cached', sats.size, 'TLEs');
  return sats;
}

export function propagateSat(tle, date = new Date()) {
  try {
    const satrec = twoline2satrec(tle.line1, tle.line2);
    const posVel = propagate(satrec, date);
    if (!posVel.position || typeof posVel.position === 'boolean') return null;

    const gmst = gstime(date);
    const geo  = eciToGeodetic(posVel.position, gmst);

    // Velocity magnitude from ECI velocity vector (km/s)
    const v = posVel.velocity;
    const velocity = v ? Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) : null;

    return {
      lat: degreesLat(geo.latitude),
      lon: degreesLong(geo.longitude),
      alt: geo.height,   // km
      velocity,          // km/s
    };
  } catch { return null; }
}

/** Parse orbital elements directly from TLE lines */
export function parseTLEOrbitalElements(tle) {
  try {
    const satrec = twoline2satrec(tle.line1, tle.line2);
    const inclinationDeg = satrec.inclo * (180 / Math.PI); // rad → deg
    const meanMotion     = satrec.no * (1440 / (2 * Math.PI)); // rad/min → rev/day
    const eccentricity   = satrec.ecco;
    const periodMin      = 1440 / meanMotion; // minutes

    // TLE epoch
    const epochYear = satrec.epochyr < 57 ? 2000 + satrec.epochyr : 1900 + satrec.epochyr;
    const epochDays = satrec.epochdays;
    const epochDate = new Date(Date.UTC(epochYear, 0, 1));
    epochDate.setUTCDate(epochDate.getUTCDate() + epochDays - 1);

    return {
      inclination: inclinationDeg,
      meanMotion,
      eccentricity,
      period: periodMin,
      epoch: epochDate,
    };
  } catch { return null; }
}

export function buildMockTLEs() {
  const mock = new Map();
  // ISS
  mock.set('25544', { noradId: '25544', name: 'ISS (ZARYA)', line1: '1 25544U 98067A   24068.54791667  .00016717  00000-0  10270-3 0  9002', line2: '2 25544  51.6400 208.5000 0001234  85.0000 275.0000 15.49000000400000' });
  // Hubble
  mock.set('20580', { noradId: '20580', name: 'HST', line1: '1 20580U 90037B   24068.00000000  .00000800  00000-0  40000-4 0  9999', line2: '2 20580  28.4700 100.0000 0002737 200.0000 160.0000 15.09000000300000' });
  // Tiangong
  mock.set('48274', { noradId: '48274', name: 'CSS (TIANHE)', line1: '1 48274U 21035A   24068.00000000  .00010000  00000-0  50000-4 0  9999', line2: '2 48274  41.4700  50.0000 0001000 300.0000  60.0000 15.60000000100000' });
  // Starlink
  mock.set('55555', { noradId: '55555', name: 'STARLINK-1234', line1: '1 55555U 20001A   24068.00000000  .00002000  00000-0  10000-4 0  9999', line2: '2 55555  53.0000 150.0000 0001500 100.0000 260.0000 15.05000000200000' });
  mock.set('55556', { noradId: '55556', name: 'STARLINK-5678', line1: '1 55556U 20002A   24068.00000000  .00002000  00000-0  10000-4 0  9999', line2: '2 55556  53.0000 200.0000 0001200  50.0000 310.0000 15.06000000150000' });
  return mock;
}
