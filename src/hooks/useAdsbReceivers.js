import { useState, useEffect, useRef } from 'react';
import { fetchAdsbReceivers } from '../providers/receiverService';
import { ADSB_RECEIVERS_POLL_MS } from '../providers/constants';

/**
 * Hook que busca localizações de feeders ADS-B do adsb.lol MLAT.
 * Faz polling a cada ADSB_RECEIVERS_POLL_MS (5 min).
 *
 * @param {boolean} enabled
 * @returns {Map<string, {id, lat, lon, user, region}>}
 */
export function useAdsbReceivers(enabled) {
  const [receivers, setReceivers] = useState(new Map());
  const abortRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      setReceivers(new Map());
      return;
    }

    let cancelled = false;

    async function load() {
      if (cancelled) return;
      abortRef.current = new AbortController();
      try {
        const data = await fetchAdsbReceivers(abortRef.current.signal);
        if (!cancelled) setReceivers(data);
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.warn('[adsb-receivers]', e.message);
        }
      }
    }

    load();
    const id = setInterval(load, ADSB_RECEIVERS_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [enabled]);

  return receivers;
}
