import { useState, useEffect } from 'react';
import { HAS_AUTH, openskyHeaders, invalidateToken } from '../providers/openskyAuth';

const POLL_INTERVAL = HAS_AUTH
  ? Number(import.meta.env.VITE_POLL_INTERVAL_AUTH_MS ?? 30000)
  : Number(import.meta.env.VITE_POLL_INTERVAL_ANON_MS ?? 60000);

// Dev flag: fetch once, cache in memory, never poll again
const USE_CACHE = import.meta.env.VITE_FLIGHT_CACHE === 'true';
let flightCache = null;

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
      callsign: (s[1] || '').trim(),
      lat,
      lon,
      heading:  heading  ?? 0,
      velocity: velocity ?? 0,
      altitude,
      category: s[17] ?? 0,
      fetchedAt: Date.now(),
    });
  }
  return map;
}

export function useFlights() {
  const [flights, setFlights] = useState(new Map());

  useEffect(() => {
    let cancelled = false;
    let timerId   = null;

    async function fetchFlights() {
      if (USE_CACHE && flightCache) {
        if (!cancelled) setFlights(flightCache);
        return;
      }
      if (document.visibilityState === 'hidden') return;
      try {
        const headers = await openskyHeaders();
        const res = await fetch('/api/opensky', { headers });
        if (res.status === 429) { console.warn('[flights] rate limited (429)'); return; }
        if (res.status === 401) { console.warn('[flights] unauthorized (401)'); invalidateToken(); return; }
        if (!res.ok) { console.warn('[flights] API error', res.status); return; }
        const data  = await res.json();
        const parsed = parseStates(data);
        console.log(`[flights] loaded ${parsed.size} flights${USE_CACHE ? ' (cached for dev)' : ''}`);
        if (USE_CACHE) flightCache = parsed;
        if (!cancelled) setFlights(parsed);
      } catch (e) {
        console.error('[flights] fetch error:', e);
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') fetchFlights();
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    fetchFlights();
    timerId = setInterval(fetchFlights, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(timerId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return flights;
}
