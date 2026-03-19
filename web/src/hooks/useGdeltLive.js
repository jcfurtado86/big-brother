import { useState, useEffect, useRef, useCallback } from 'react';
import { API_URL } from '../utils/api';

const POLL_INTERVAL = 15 * 60 * 1000; // 15 min

export function useGdeltLive(enabled = false) {
  const [points, setPoints] = useState(() => new Map());
  const [newIds, setNewIds] = useState(() => new Set());
  const abortRef = useRef(null);
  const knownIdsRef = useRef(new Set());
  const timerRef = useRef(null);
  const newIdTimerRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const url = `${API_URL}/api/gdelt/live?since=${since}`;
      const res = await fetch(url, { signal: ac.signal });
      if (!res.ok) return;

      const rows = await res.json();
      const map = new Map();
      const freshIds = new Set();

      for (const r of rows) {
        if (r.lat == null || r.lng == null) continue;
        const id = `gdelt_${r.id}`;
        map.set(id, {
          id,
          lat: r.lat,
          lon: r.lng,
          category: r.event_type || 'conflict',
          title: r.title || '',
          url: r.url || r.source_url || '',
          domain: r.domain || '',
          socialimage: r.socialimage || '',
          tone: r.tone ?? 0,
          toneLabel: r.tone_label || 'neutral',
          country: r.country || '',
          sourceDate: r.source_date || '',
          seenAt: r.seen_at || '',
          actor1Name: r.actor1_name || '',
          actor2Name: r.actor2_name || '',
          actionGeoName: r.action_geo_name || '',
          goldsteinScale: r.goldstein_scale ?? null,
        });

        if (!knownIdsRef.current.has(id)) {
          freshIds.add(id);
        }
      }

      // Update known IDs
      knownIdsRef.current = new Set(map.keys());

      if (!ac.signal.aborted) {
        setPoints(map);
        setNewIds(freshIds);

        // Clear newIds after 5 min
        if (freshIds.size > 0) {
          if (newIdTimerRef.current) clearTimeout(newIdTimerRef.current);
          newIdTimerRef.current = setTimeout(() => setNewIds(new Set()), 5 * 60 * 1000);
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.warn('[gdelt] fetch error:', e.message);
      }
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setPoints(new Map());
      setNewIds(new Set());
      knownIdsRef.current.clear();
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // Immediate fetch
    fetchData();

    // Poll every 15 min
    timerRef.current = setInterval(fetchData, POLL_INTERVAL);

    return () => {
      abortRef.current?.abort();
      if (timerRef.current) clearInterval(timerRef.current);
      if (newIdTimerRef.current) clearTimeout(newIdTimerRef.current);
    };
  }, [enabled, fetchData]);

  return { points, newIds };
}
