import { useState, useEffect, useRef, useCallback } from 'react';
import { getSetting } from '../providers/settingsStore';
import { computeBboxFromViewer } from '../utils/bboxUtils';
import { useLoading } from '../contexts/LoadingContext';

/**
 * Shared hook for layers that fetch by viewport bbox.
 * Re-fetches when camera moves. Only visible data kept in memory.
 *
 * @param {object}   viewer   - Cesium viewer instance
 * @param {boolean}  enabled  - whether the layer is toggled on
 * @param {object}   opts
 * @param {Function} opts.fetchFn      - (bbox, signal) => Promise<Array> — fetches points for bbox string
 * @param {string}   opts.maxAltKey    - settings key for max camera altitude
 * @param {string}   opts.debounceKey  - settings key for debounce interval (ms)
 */
export function useGlobalPointsData(viewer, enabled, { fetchFn, maxAltKey, debounceKey }) {
  const [pointsMap, setPointsMap] = useState(new Map());
  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  const lastBboxRef = useRef(null);
  const { start: loadStart, done: loadDone } = useLoading();

  const fetchVisible = useCallback(async () => {
    if (!viewer || viewer.isDestroyed()) return;
    if (document.hidden) return;

    const carto = viewer.camera.positionCartographic;
    const alt = carto ? carto.height : Infinity;
    if (alt > getSetting(maxAltKey)) {
      setPointsMap(prev => prev.size === 0 ? prev : new Map());
      return;
    }

    const bbox = computeBboxFromViewer(viewer);
    if (!bbox) return;

    // Skip if bbox hasn't changed significantly
    const prev = lastBboxRef.current;
    if (prev &&
        Math.abs(prev.south - bbox.south) < 0.5 &&
        Math.abs(prev.north - bbox.north) < 0.5 &&
        Math.abs(prev.west - bbox.west) < 0.5 &&
        Math.abs(prev.east - bbox.east) < 0.5) {
      return;
    }
    lastBboxRef.current = bbox;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      loadStart();
      const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
      const points = await fetchFn(bboxStr, controller.signal);
      if (controller.signal.aborted || !points) return;

      const map = new Map();
      for (const p of points) map.set(p.id, p);
      setPointsMap(map);
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('[pointsData] fetch error:', e.message);
    } finally {
      loadDone();
    }
  }, [viewer, maxAltKey, fetchFn]);

  useEffect(() => {
    if (!viewer || !enabled) {
      setPointsMap(prev => prev.size === 0 ? prev : new Map());
      lastBboxRef.current = null;
      return;
    }

    fetchVisible();

    function onCameraChange() {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(fetchVisible, getSetting(debounceKey));
    }

    const removeListener = viewer.camera.changed.addEventListener(onCameraChange);

    return () => {
      removeListener();
      clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [viewer, enabled, fetchVisible, debounceKey]);

  return pointsMap;
}
