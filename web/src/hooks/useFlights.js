import { useState, useEffect, useRef } from 'react';
import { getProvider } from '../providers/flightProviders';
import { idbGet, idbSet, idbDelete, idbPurgeExpired } from '../utils/idbCache';
import { FLIGHT_RETRY_MS, FLIGHT_CACHE_TTL_MS } from '../providers/constants';
import { getSetting } from '../providers/settingsStore';

// Purge expired flight cache entries on startup
idbPurgeExpired('flights', FLIGHT_CACHE_TTL_MS);

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
  const pad = getSetting('FETCH_PADDING');
  const latPad = (bbox.north - bbox.south) * pad;
  const lonPad = (bbox.east  - bbox.west)  * pad;
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
      if (document.visibilityState === 'hidden') { schedule(pollInterval); return; }

      const age = Date.now() - fetchedAtRef.current;

      // ── Global providers: simple fixed-interval poll, no bbox logic ──
      if (isGlobal) {
        if (age < pollInterval && fetchedMapRef.current.size > 0) {
          if (!cancelled) setFlights(fetchedMapRef.current);
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
