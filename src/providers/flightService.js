// Abstrai as chamadas HTTP ao provedor de dados de voo (OpenSky Network).
// Para trocar de provedor no futuro: substitua apenas este arquivo,
// mantendo as mesmas assinaturas exportadas.

import { openskyHeaders, invalidateToken } from './openskyAuth';

// ── Parse interno (especifico do contrato OpenSky) ────────────────────────────

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
    const onGround = s[8];
    if (!lat || !lon || onGround) continue;
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

// ── API publica ───────────────────────────────────────────────────────────────

/**
 * Busca todos os voos em tempo real.
 * @returns {Promise<Map<string, object> | null>} null em caso de erro recuperavel
 */
export async function fetchFlights() {
  const headers = await openskyHeaders();
  const res = await fetch('/api/opensky', { headers });

  if (res.status === 429) { console.warn('[flightService] rate limited (429)'); return null; }
  if (res.status === 401) { console.warn('[flightService] unauthorized (401)'); invalidateToken(); return null; }
  if (!res.ok)            { console.warn('[flightService] API error', res.status); return null; }

  return parseStates(await res.json());
}

/**
 * Busca o historico de track de um voo.
 * @param {string} icao24
 * @returns {Promise<Array<{lat: number, lon: number, alt: number}> | null>}
 */
export async function fetchTrack(icao24) {
  const headers = await openskyHeaders();
  const res = await fetch(`/api/opensky-track?icao24=${icao24}&time=0`, { headers });
  if (!res.ok) return null;
  return parseTrackPositions(await res.json());
}
