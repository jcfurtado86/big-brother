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

