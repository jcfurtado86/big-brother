import { useState, useEffect } from 'react';
import { fetchTLEs, buildMockTLEs } from '../providers/satelliteService';
import { SATELLITE_POLL_MS } from '../providers/constants';

const USE_MOCK = import.meta.env.VITE_MOCK_SATELLITES === 'true';

export function useSatellites(enabled = false) {
  const [satellites, setSatellites] = useState(new Map());

  useEffect(() => {
    if (!enabled) {
      setSatellites(new Map());
      return;
    }

    if (USE_MOCK) {
      console.log('[satellites] using mock TLEs');
      setSatellites(buildMockTLEs());
      return;
    }

    const ac = new AbortController();

    async function load() {
      if (document.hidden) return;
      try {
        const sats = await fetchTLEs(ac.signal, SATELLITE_POLL_MS);
        if (!ac.signal.aborted) setSatellites(sats);
      } catch (e) {
        if (!ac.signal.aborted) console.warn('[satellites] fetch error:', e.message);
      }
    }

    load();
    const id = setInterval(load, SATELLITE_POLL_MS);

    return () => {
      ac.abort();
      clearInterval(id);
    };
  }, [enabled]);

  return satellites;
}
