import { useState, useEffect, useRef } from 'react';
import { getProvider } from '../providers/flightProviders';
import { idbGet, idbSet, idbDelete, idbPurgeExpired } from '../utils/idbCache';
import { FETCH_PADDING, FLIGHT_RETRY_MS, FLIGHT_CACHE_TTL_MS } from '../providers/constants';

// Purge expired flight cache entries on startup
idbPurgeExpired('flights', FLIGHT_CACHE_TTL_MS);

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

function makeCacheKey(provider, bbox) {
  if (provider.global) return `${provider.name}_global`;
  const r = (n) => Math.round(n);
  return `${provider.name}_${r(bbox.south)}_${r(bbox.west)}_${r(bbox.north)}_${r(bbox.east)}`;
}

async function loadFlightCache(provider, bbox) {
  const key = makeCacheKey(provider, bbox);
  const data = await idbGet('flights', key);
  if (!data) return null;
  if (Date.now() - data.ts > FLIGHT_CACHE_TTL_MS) { idbDelete('flights', key); return null; }
  return new Map(data.entries);
}

function saveFlightCache(provider, bbox, map) {
  idbSet('flights', makeCacheKey(provider, bbox), { ts: Date.now(), entries: [...map] });
}

// ── bbox helpers ──────────────────────────────────────────────────────────────

function bboxToKey(bbox) {
  if (bbox === undefined) return '__pending__';
  if (bbox === null)      return '__global__';
  return `${bbox.south.toFixed(1)},${bbox.west.toFixed(1)},${bbox.north.toFixed(1)},${bbox.east.toFixed(1)}`;
}

function bboxContains(outer, inner) {
  if (outer === null) return true;
  if (inner === null) return false;
  return inner.south >= outer.south && inner.north <= outer.north &&
         inner.west  >= outer.west  && inner.east  <= outer.east;
}

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

export function useFlights(enabled = true, bbox = undefined, providerName = 'opensky') {
  const provider   = getProvider(providerName);
  const isGlobal   = !!provider.global;
  const bboxKey    = bboxToKey(bbox);
  const [flights, setFlights] = useState(new Map());
  const bboxRef    = useRef(bbox);
  const refetchRef = useRef(null);
  bboxRef.current  = bbox;

  const abortRef        = useRef(null);
  const fetchedBboxRef  = useRef(undefined);
  const fetchedAtRef    = useRef(0);
  const fetchedMapRef   = useRef(new Map());

  // Reset state when provider changes (refs only — the main effect handles the re-poll)
  const prevProviderRef = useRef(providerName);
  if (prevProviderRef.current !== providerName) {
    prevProviderRef.current = providerName;
    fetchedBboxRef.current  = undefined;
    fetchedAtRef.current    = 0;
    fetchedMapRef.current   = new Map();
  }

  const bboxReady = enabled && bbox !== undefined;
  useEffect(() => {
    if (!bboxReady) {
      if (!enabled) setFlights(new Map());
      return;
    }

    const pollInterval    = provider.pollInterval;
    const MIN_REFETCH_GAP = Math.max(pollInterval / 3, 2000);
    let cancelled    = false;
    let timerId      = null;
    let nextFireAt   = null;

    async function poll() {
      if (USE_MOCK) { if (!cancelled) setFlights(buildMockFlights()); return; }
      if (USE_DEV_CACHE && devCache) { if (!cancelled) setFlights(devCache); return; }
      if (document.visibilityState === 'hidden') { schedule(pollInterval); return; }

      const age = Date.now() - fetchedAtRef.current;

      // ── Global providers: simple fixed-interval poll, no bbox logic ──
      if (isGlobal) {
        if (age < pollInterval && fetchedMapRef.current.size > 0) {
          schedule(pollInterval - age);
          return;
        }
      } else {
        // ── Bbox providers: check containment ──
        const currentBbox = bboxRef.current;
        if (
          fetchedBboxRef.current !== undefined &&
          bboxContains(fetchedBboxRef.current, currentBbox) &&
          age < pollInterval
        ) {
          if (!cancelled) setFlights(fetchedMapRef.current);
          schedule(pollInterval - age);
          return;
        }

        // Debounce rapid bbox changes
        if (age < MIN_REFETCH_GAP) {
          schedule(MIN_REFETCH_GAP - age);
          return;
        }
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const currentBbox = bboxRef.current;
      const fetchBbox   = isGlobal ? null : expandBbox(currentBbox);

      // Show IDB cache while fetching
      if (!isGlobal && currentBbox !== null) {
        const cached = await loadFlightCache(provider, currentBbox);
        if (cached && !cancelled) setFlights(cached);
      } else if (isGlobal) {
        const cached = await loadFlightCache(provider, null);
        if (cached && !cancelled) setFlights(cached);
      }

      try {
        const parsed = await provider.fetchFlights(fetchBbox, controller.signal);
        if (cancelled) return;

        if (parsed === null) {
          fetchedBboxRef.current = isGlobal ? null : fetchBbox;
          fetchedAtRef.current   = Date.now();
          schedule(provider.retryInterval ?? FLIGHT_RETRY_MS);
          return;
        }

        if (USE_DEV_CACHE) devCache = parsed;
        saveFlightCache(provider, fetchBbox, parsed);

        fetchedBboxRef.current = isGlobal ? null : fetchBbox;
        fetchedAtRef.current   = Date.now();
        fetchedMapRef.current  = parsed;

        const now = Date.now();
        setFlights(prev => {
          const merged = new Map();
          for (const [icao, flight] of prev) {
            if (now - flight.fetchedAt < FLIGHT_CACHE_TTL_MS) merged.set(icao, flight);
          }
          for (const [icao, flight] of parsed) {
            merged.set(icao, flight);
          }
          // Skip re-render if same flights with same data
          if (merged.size === prev.size) {
            let same = true;
            for (const [icao, f] of merged) {
              if (prev.get(icao)?.fetchedAt !== f.fetchedAt) { same = false; break; }
            }
            if (same) return prev;
          }
          return merged;
        });
        schedule(pollInterval);
      } catch (e) {
        if (e.name === 'AbortError') return;
        console.error('[flights] fetch error:', e);
        if (!cancelled) schedule(provider.retryInterval ?? FLIGHT_RETRY_MS);
      }
    }

    function schedule(ms) {
      if (cancelled) return;
      timerId = setTimeout(poll, Math.max(0, ms));
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') { clearTimeout(timerId); poll(); }
    }

    // Request a sooner poll (used by bbox-change effect)
    refetchRef.current = () => {
      if (cancelled) return;
      const age = Date.now() - fetchedAtRef.current;
      const currentBbox = bboxRef.current;
      // Still inside fetched area — no need to refetch
      if (
        fetchedBboxRef.current !== undefined &&
        bboxContains(fetchedBboxRef.current, currentBbox) &&
        age < pollInterval
      ) return;
      // Schedule a fetch after debounce, but don't cancel existing timer
      // unless the new timer would fire sooner
      const delay = Math.max(0, MIN_REFETCH_GAP - age);
      const fireAt = Date.now() + delay;
      if (nextFireAt === null || fireAt < nextFireAt) {
        clearTimeout(timerId);
        nextFireAt = fireAt;
        timerId = setTimeout(() => { nextFireAt = null; poll(); }, delay);
      }
    };

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
  }, [bboxReady, providerName]);

  // Bbox changes trigger refetch only for non-global providers
  useEffect(() => {
    if (isGlobal) return;
    if (bbox === undefined) return;
    refetchRef.current?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bboxKey]);

  return flights;
}
