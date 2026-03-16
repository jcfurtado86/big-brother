import { useState, useEffect, useRef } from 'react';
import { fetchVessels } from '../providers/vesselService';
import { computeBboxFromViewer } from '../utils/bboxUtils';
import { idbGet, idbSet, idbPurgeExpired } from '../utils/idbCache';
import { getSetting } from '../providers/settingsStore';

// Purge expired vessel cache on startup
idbPurgeExpired('vessels', getSetting('VESSEL_STALE_MS'));

const POLL_INTERVAL = 60_000; // 60s

// ── hook ──────────────────────────────────────────────────────────────────────

export function useVessels(viewer, enabled = false) {
  const [vessels, setVessels] = useState(new Map());
  const vesselsMapRef = useRef(new Map());
  const abortRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      vesselsMapRef.current.clear();
      setVessels(new Map());
      return;
    }

    if (!viewer) return;

    const vesselsMap = vesselsMapRef.current;
    let cancelled = false;
    let timerId = null;

    // Load IDB cache first
    idbGet('vessels', 'vessels_all').then(cached => {
      if (!cached || cancelled) return;
      const now = Date.now();
      let loaded = 0;
      for (const [mmsi, v] of cached.entries) {
        if (now - v.fetchedAt < getSetting('VESSEL_STALE_MS')) {
          vesselsMap.set(mmsi, v);
          loaded++;
        }
      }
      if (loaded > 0) {
        console.log('[vessels] loaded', loaded, 'from IDB cache');
        setVessels(new Map(vesselsMap));
      }
    });

    async function poll() {
      if (cancelled) return;
      if (document.hidden) { schedule(POLL_INTERVAL); return; }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const bbox = computeBboxFromViewer(viewer);
        const result = await fetchVessels(bbox, controller.signal);

        if (cancelled || !result) {
          schedule(POLL_INTERVAL);
          return;
        }

        // Merge: keep vessels from previous poll that are still fresh
        const now = Date.now();
        const staleMs = getSetting('VESSEL_STALE_MS');
        for (const [mmsi, v] of vesselsMap) {
          if (now - v.fetchedAt > staleMs) vesselsMap.delete(mmsi);
        }
        for (const [mmsi, v] of result) {
          vesselsMap.set(mmsi, v);
        }

        console.log('[vessels] polled:', result.size, '| total:', vesselsMap.size);
        setVessels(new Map(vesselsMap));
        idbSet('vessels', 'vessels_all', { ts: now, entries: [...vesselsMap] });
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.warn('[vessels] poll error:', e.message);
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
  }, [viewer, enabled]);

  return vessels;
}
