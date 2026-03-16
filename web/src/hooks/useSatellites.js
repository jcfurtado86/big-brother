import { useState, useEffect } from 'react';
import { fetchTLEs } from '../providers/satelliteService';
import { SATELLITE_POLL_MS } from '../providers/constants';
import { useLoading } from '../contexts/LoadingContext';

export function useSatellites(enabled = false) {
  const [satellites, setSatellites] = useState(new Map());
  const { start: loadStart, done: loadDone } = useLoading();

  useEffect(() => {
    if (!enabled) {
      setSatellites(new Map());
      return;
    }

    const ac = new AbortController();

    async function load() {
      if (document.hidden) return;
      loadStart();
      try {
        const sats = await fetchTLEs(ac.signal, SATELLITE_POLL_MS);
        if (!ac.signal.aborted) setSatellites(sats);
      } catch (e) {
        if (!ac.signal.aborted) console.warn('[satellites] fetch error:', e.message);
      } finally {
        loadDone();
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
