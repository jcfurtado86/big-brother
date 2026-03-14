import { useState, useEffect, useRef } from 'react';
import { HAS_AUTH }    from '../providers/openskyAuth';
import { fetchFlights } from '../providers/flightService';
import { idbGet, idbSet, idbDelete } from '../utils/idbCache';

const POLL_INTERVAL  = HAS_AUTH
  ? Number(import.meta.env.VITE_POLL_INTERVAL_AUTH_MS ?? 60_000)
  : Number(import.meta.env.VITE_POLL_INTERVAL_ANON_MS ?? 60_000);
const RETRY_INTERVAL = Number(import.meta.env.VITE_RETRY_INTERVAL_MS ?? 1_200_000);
const CACHE_TTL_MS   = Number(import.meta.env.VITE_FLIGHT_CACHE_TTL_MS ?? 5 * 60_000);

const USE_DEV_CACHE = import.meta.env.VITE_FLIGHT_CACHE === 'true';
const USE_MOCK      = import.meta.env.VITE_MOCK_FLIGHTS === 'true';
let devCache = null;

// ── Mock flights for offline testing ─────────────────────────────────────────

function buildMockFlights() {
  const now = Date.now();
  const mock = [
    { icao24: 'MOCK01', callsign: 'GLO1234',  country: 'Brazil', lat: -23.55, lon: -46.63, heading: 45,  velocity: 220, altitude: 10000, category: 1 },
    { icao24: 'MOCK02', callsign: 'TAM5678',  country: 'Brazil', lat: -22.91, lon: -43.17, heading: 180, velocity: 250, altitude: 11500, category: 1 },
    { icao24: 'MOCK03', callsign: 'AZU9012',  country: 'Brazil', lat: -19.85, lon: -43.95, heading: 270, velocity: 200, altitude: 8500,  category: 1 },
    { icao24: 'MOCK04', callsign: 'UAL345',   country: 'United States', lat: -15.87, lon: -47.93, heading: 10,  velocity: 260, altitude: 12000, category: 3 },
    { icao24: 'MOCK05', callsign: 'DLH678',   country: 'Germany', lat: -25.43, lon: -49.27, heading: 120, velocity: 230, altitude: 9800,  category: 1 },
  ];
  const map = new Map();
  for (const f of mock) map.set(f.icao24, { ...f, fetchedAt: now });
  return map;
}

// ── IndexedDB cache ──────────────────────────────────────────────────────────

function cacheKey(bbox) {
  const r = (n) => Math.round(n);
  return `${r(bbox.south)}_${r(bbox.west)}_${r(bbox.north)}_${r(bbox.east)}`;
}

async function loadFlightCache(bbox) {
  const data = await idbGet('flights', cacheKey(bbox));
  if (!data) return null;
  if (Date.now() - data.ts > CACHE_TTL_MS) { idbDelete('flights', cacheKey(bbox)); return null; }
  return new Map(data.entries);
}

function saveFlightCache(bbox, map) {
  idbSet('flights', cacheKey(bbox), { ts: Date.now(), entries: [...map] });
}

// ── bbox helpers ──────────────────────────────────────────────────────────────

function bboxToKey(bbox) {
  if (bbox === undefined) return '__pending__';
  if (bbox === null)      return '__global__';
  return `${bbox.south.toFixed(1)},${bbox.west.toFixed(1)},${bbox.north.toFixed(1)},${bbox.east.toFixed(1)}`;
}

// Returns true if `inner` is fully covered by `outer`.
// null = global (covers everything).
function bboxContains(outer, inner) {
  if (outer === null) return true;   // global covers any region
  if (inner === null) return false;  // global is not covered by a region
  return inner.south >= outer.south && inner.north <= outer.north &&
         inner.west  >= outer.west  && inner.east  <= outer.east;
}

// Expands a bbox by `factor` of its own size on each side.
// Fetching a larger area means small pans stay within the cached region.
import { FETCH_PADDING } from '../providers/constants';
function expandBbox(bbox) {
  if (!bbox) return bbox;
  const latPad = (bbox.north - bbox.south) * FETCH_PADDING;
  const lonPad = (bbox.east  - bbox.west)  * FETCH_PADDING;
  return {
    south: Math.max(bbox.south - latPad, -90),
    north: Math.min(bbox.north + latPad,  90),
    west:  Math.max(bbox.west  - lonPad, -180),
    east:  Math.min(bbox.east  + lonPad,  180),
  };
}

// ── hook ──────────────────────────────────────────────────────────────────────

export function useFlights(enabled = true, bbox = undefined) {
  const bboxKey    = bboxToKey(bbox);
  const [flights, setFlights] = useState(new Map());
  const bboxRef    = useRef(bbox);
  const refetchRef = useRef(null);
  bboxRef.current  = bbox;

  const abortRef        = useRef(null);        // current AbortController
  const fetchedBboxRef  = useRef(undefined);   // bbox of last successful API fetch
  const fetchedAtRef    = useRef(0);           // timestamp of last successful API fetch
  const fetchedMapRef   = useRef(new Map());   // unfiltered result of last successful API fetch

  const bboxReady = enabled && bbox !== undefined;
  useEffect(() => {
    if (!bboxReady) {
      if (!enabled) setFlights(new Map());
      return;
    }

    let cancelled = false;
    let timerId   = null;

    async function poll() {
      if (USE_MOCK) { if (!cancelled) setFlights(buildMockFlights()); return; }
      if (USE_DEV_CACHE && devCache) { if (!cancelled) setFlights(devCache); return; }
      if (document.visibilityState === 'hidden') { schedule(POLL_INTERVAL); return; }

      const currentBbox = bboxRef.current;
      const age         = Date.now() - fetchedAtRef.current;

      // ── In-memory containment check ──────────────────────────────────────────
      // If the new bbox is fully inside the last fetched region AND data is still
      // fresh, skip the API call. Pass the full fetched map — the live visibility
      // filter in Globe.jsx handles showing only what's in the current viewport,
      // so we never remove/re-add billboards just because the camera moved.
      if (
        fetchedBboxRef.current !== undefined &&
        bboxContains(fetchedBboxRef.current, currentBbox) &&
        age < POLL_INTERVAL
      ) {
        if (!cancelled) setFlights(fetchedMapRef.current);
        schedule(POLL_INTERVAL - age); // wait until data actually goes stale
        return;
      }

      // ── API fetch ─────────────────────────────────────────────────────────────
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Show cached data immediately for regional views
      if (currentBbox !== null) {
        const cached = await loadFlightCache(currentBbox);
        if (cached && !cancelled) setFlights(cached);
      }

      // Fetch a padded bbox so small pans stay within the cached region
      const fetchBbox = expandBbox(currentBbox);

      try {
        const parsed = await fetchFlights(fetchBbox, controller.signal);
        if (cancelled) return;

        if (parsed === null) { schedule(RETRY_INTERVAL); return; }

        if (USE_DEV_CACHE) devCache = parsed;
        if (fetchBbox !== null) saveFlightCache(fetchBbox, parsed);

        // Store the padded bbox — containment checks against the larger area
        fetchedBboxRef.current = fetchBbox;
        fetchedAtRef.current   = Date.now();
        fetchedMapRef.current  = parsed;

        // Merge new data into existing flights.
        // - Flights in the viewport get updated positions from the API.
        // - Flights outside the viewport keep their last known position
        //   (dead reckoning continues from there).
        // - Flights not refreshed within CACHE_TTL_MS are evicted.
        const now = Date.now();
        setFlights(prev => {
          const merged = new Map();
          for (const [icao, flight] of prev) {
            if (now - flight.fetchedAt < CACHE_TTL_MS) merged.set(icao, flight);
          }
          for (const [icao, flight] of parsed) {
            merged.set(icao, flight);
          }
          return merged;
        });
        schedule(POLL_INTERVAL);
      } catch (e) {
        if (e.name === 'AbortError') return;
        console.error('[flights] fetch error:', e);
        if (!cancelled) schedule(RETRY_INTERVAL);
      }
    }

    function schedule(ms) {
      if (cancelled) return;
      timerId = setTimeout(poll, Math.max(0, ms));
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') { clearTimeout(timerId); poll(); }
    }

    refetchRef.current = () => { clearTimeout(timerId); poll(); };

    document.addEventListener('visibilitychange', onVisibilityChange);
    poll();

    return () => {
      cancelled = true;
      clearTimeout(timerId);
      abortRef.current?.abort();
      refetchRef.current = null;
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bboxReady]);

  // When bbox changes, check containment (via poll) immediately.
  useEffect(() => {
    if (bbox === undefined) return;
    refetchRef.current?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bboxKey]);

  return flights;
}
