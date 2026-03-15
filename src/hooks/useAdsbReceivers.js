import { useState, useEffect, useRef } from 'react';
import { fetchAdsbReceivers, loadCachedReceivers } from '../providers/receiverService';
import { ADSB_RECEIVERS_POLL_MS } from '../providers/constants';

/**
 * Hook que busca localizações de feeders ADS-B do adsb.lol MLAT.
 * - Carrega do IDB cache imediatamente (render instantâneo)
 * - Faz fetch remoto e depois poll a cada 1h
 * - Quando desligado, para de consumir a API
 *
 * @param {boolean} enabled
 * @returns {Map<string, {id, lat, lon, user, region}>}
 */
export function useAdsbReceivers(enabled) {
  const [receivers, setReceivers] = useState(new Map());
  const abortRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    // Carrega cache IDB primeiro (instantâneo)
    loadCachedReceivers().then(cached => {
      if (cancelled || !cached) return;
      setReceivers(cached);
    });

    async function fetchRemote() {
      if (cancelled) return;
      abortRef.current = new AbortController();
      try {
        const data = await fetchAdsbReceivers(abortRef.current.signal);
        if (!cancelled && data.size > 0) setReceivers(data);
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.warn('[adsb-receivers]', e.message);
        }
      }
    }

    fetchRemote();
    const id = setInterval(fetchRemote, ADSB_RECEIVERS_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [enabled]);

  return receivers;
}
