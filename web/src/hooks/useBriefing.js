import { useState, useCallback, useRef } from 'react';
import { API_URL } from '../utils/api';

export function useBriefing() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  const fetchBriefing = useCallback(async (lat, lon, radius = 200) => {
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setData(null);

    try {
      const res = await fetch(
        `${API_URL}/api/briefing?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&radius=${radius}`,
        { signal: ac.signal }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!ac.signal.aborted) setData(json);
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('[briefing] error:', e.message);
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setData(null);
    setLoading(false);
  }, []);

  return { data, loading, fetchBriefing, clear };
}
