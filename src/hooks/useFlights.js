import { useState, useEffect } from 'react';
import { HAS_AUTH }    from '../providers/openskyAuth';
import { fetchFlights } from '../providers/flightService';

const POLL_INTERVAL = HAS_AUTH
  ? Number(import.meta.env.VITE_POLL_INTERVAL_AUTH_MS ?? 30000)
  : Number(import.meta.env.VITE_POLL_INTERVAL_ANON_MS ?? 60000);

// Dev flag: fetch once, cache in memory, never poll again
const USE_CACHE = import.meta.env.VITE_FLIGHT_CACHE === 'true';
let flightCache = null;

export function useFlights(enabled = true) {
  const [flights, setFlights] = useState(new Map());

  useEffect(() => {
    if (!enabled) {
      setFlights(new Map());
      return;
    }

    let cancelled = false;
    let timerId   = null;

    async function poll() {
      if (USE_CACHE && flightCache) {
        if (!cancelled) setFlights(flightCache);
        return;
      }
      if (document.visibilityState === 'hidden') return;
      try {
        const parsed = await fetchFlights();
        if (parsed === null || cancelled) return;
        console.log(`[flights] loaded ${parsed.size} flights${USE_CACHE ? ' (cached for dev)' : ''}`);
        if (USE_CACHE) flightCache = parsed;
        setFlights(parsed);
      } catch (e) {
        console.error('[flights] fetch error:', e);
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') poll();
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    poll();
    timerId = setInterval(poll, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(timerId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled]);

  return flights;
}
