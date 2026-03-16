import { useState, useEffect, useRef } from 'react';
import { fetchVessels } from '../providers/vesselService';
import { computeBboxFromViewer } from '../utils/bboxUtils';
import { idbGet, idbSet, idbPurgeExpired } from '../utils/idbCache';
import { getSetting } from '../providers/settingsStore';

// Purge expired vessel cache on startup
idbPurgeExpired('vessels', getSetting('VESSEL_STALE_MS'));

const USE_MOCK = import.meta.env.VITE_MOCK_VESSELS === 'true';
const POLL_INTERVAL = 60_000; // 60s

// ── Mock vessels ──────────────────────────────────────────────────────────────

function buildMockVessels() {
  const now = Date.now();
  const mock = [
    { mmsi: '710000001', name: 'SANTOS EXPRESS',   lat: -23.98, lon: -46.30, cog: 180, sog: 8.5,  heading: 178, navStatus: 0, rateOfTurn: 2,    shipType: 70, destination: 'BUENOS AIRES',  callsign: 'PPSA',  imo: 9100001, draught: 11.2, length: 294, beam: 32, eta: { month: 3, day: 18, hour: 14, minute: 0 }, country: 'Brazil' },
    { mmsi: '710000002', name: 'PETROBRAS VII',    lat: -24.02, lon: -46.25, cog: 90,  sog: 0,    heading: 92,  navStatus: 1, rateOfTurn: 0,    shipType: 80, destination: 'SANTOS',         callsign: 'PPVII', imo: 9100002, draught: 14.8, length: 332, beam: 58, eta: null, country: 'Brazil' },
    { mmsi: '710000003', name: 'MSC SEAVIEW',      lat: -22.88, lon: -43.10, cog: 45,  sog: 18.2, heading: 44,  navStatus: 0, rateOfTurn: -3,   shipType: 60, destination: 'SALVADOR',        callsign: 'MSCV',  imo: 9100003, draught: 8.5,  length: 323, beam: 41, eta: { month: 3, day: 15, hour: 8, minute: 30 }, country: 'Brazil' },
    { mmsi: '710000004', name: 'MARIA DO MAR',     lat: -22.92, lon: -43.15, cog: 270, sog: 3.1,  heading: 268, navStatus: 7, rateOfTurn: null,  shipType: 30, destination: '',                callsign: '',       imo: 0,       draught: 3.2,  length: 18,  beam: 5,  eta: null, country: 'Brazil' },
    { mmsi: '710000005', name: 'SMIT REBOCADOR',   lat: -23.80, lon: -45.40, cog: 150, sog: 6.0,  heading: 148, navStatus: 0, rateOfTurn: 5,    shipType: 52, destination: 'SAO SEBASTIAO',   callsign: 'PPSR',  imo: 9100005, draught: 5.0,  length: 32,  beam: 12, eta: null, country: 'Brazil' },
  ];
  const map = new Map();
  for (const v of mock) map.set(v.mmsi, { ...v, timeUtc: new Date(now - Math.random() * 300_000).toISOString(), fetchedAt: now });
  return map;
}

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

    if (USE_MOCK) {
      setVessels(buildMockVessels());
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
