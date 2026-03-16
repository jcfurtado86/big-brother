import { useState, useEffect, useRef } from 'react';
import { fetchAisStations } from '../providers/receiverService';
import { RECEIVER_TTL_MS } from '../providers/constants';
import { idbGet, idbSet } from '../utils/idbCache';

const IDB_STORE = 'receivers';
const IDB_KEY   = 'ais_stations';
const POLL_INTERVAL = 5 * 60_000; // 5 min — stations are fairly static

/**
 * Hook que coleta AIS Base Stations via REST polling.
 * - Carrega cache IDB no startup (render instantâneo)
 * - Polling REST /api/ais-stations a cada 5 min
 * - Salva no IDB após cada fetch
 */
export function useAisStations(enabled) {
  const [stations, setStations] = useState(new Map());
  const abortRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      setStations(new Map());
      return;
    }

    let cancelled = false;
    let timerId = null;

    // Load IDB cache first
    idbGet(IDB_STORE, IDB_KEY).then(cached => {
      if (!cached || cancelled) return;
      if ((Date.now() - cached.ts) >= RECEIVER_TTL_MS) return;

      const map = new Map();
      for (const s of cached.data) map.set(s.mmsi, s);
      if (map.size > 0) {
        console.log(`[ais-stations] loaded ${map.size} from cache`);
        setStations(map);
      }
    });

    async function poll() {
      if (cancelled) return;
      if (document.hidden) { schedule(POLL_INTERVAL); return; }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const result = await fetchAisStations(controller.signal);
        if (cancelled || result.size === 0) {
          schedule(POLL_INTERVAL);
          return;
        }

        setStations(result);
        idbSet(IDB_STORE, IDB_KEY, { ts: Date.now(), data: [...result.values()] });
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.warn('[ais-stations] poll error:', e.message);
        }
      }

      schedule(POLL_INTERVAL);
    }

    function schedule(ms) {
      if (cancelled) return;
      timerId = setTimeout(poll, ms);
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        clearTimeout(timerId);
        poll();
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    poll();

    return () => {
      cancelled = true;
      clearTimeout(timerId);
      abortRef.current?.abort();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled]);

  return stations;
}
