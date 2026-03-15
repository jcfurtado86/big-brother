import { useState, useEffect, useRef, useCallback } from 'react';
import { getSetting } from '../providers/settingsStore';
import { computeBboxFromViewer } from '../utils/bboxUtils';

/**
 * Shared hook for layers that do a single global fetch + viewport filtering.
 * Used by ATC, Military, and any future "fetch all → filter by bbox" layer.
 *
 * @param {object}   viewer   - Cesium viewer instance
 * @param {boolean}  enabled  - whether the layer is toggled on
 * @param {object}   opts
 * @param {Function} opts.fetchFn      - (signal) => Promise<Array> — fetches all points
 * @param {string}   opts.maxAltKey    - settings key for max camera altitude
 * @param {string}   opts.debounceKey  - settings key for debounce interval (ms)
 */
export function useGlobalPointsData(viewer, enabled, { fetchFn, maxAltKey, debounceKey }) {
  const [pointsMap, setPointsMap] = useState(new Map());
  const allPointsRef = useRef(null);
  const debounceRef = useRef(null);

  const filterVisible = useCallback(() => {
    if (!viewer || viewer.isDestroyed() || !allPointsRef.current) return;
    if (document.hidden) return;

    const carto = viewer.camera.positionCartographic;
    const alt = carto ? carto.height : Infinity;
    if (alt > getSetting(maxAltKey)) {
      setPointsMap(prev => prev.size === 0 ? prev : new Map());
      return;
    }

    const bbox = computeBboxFromViewer(viewer);
    if (!bbox) return;

    const visible = new Map();
    for (const p of allPointsRef.current) {
      if (p.lat >= bbox.south && p.lat <= bbox.north &&
          p.lon >= bbox.west  && p.lon <= bbox.east) {
        visible.set(p.id, p);
      }
    }
    setPointsMap(visible);
  }, [viewer, maxAltKey]);

  useEffect(() => {
    if (!viewer || !enabled) {
      setPointsMap(prev => prev.size === 0 ? prev : new Map());
      return;
    }

    const controller = new AbortController();

    fetchFn(controller.signal).then(points => {
      if (controller.signal.aborted || !points) return;
      allPointsRef.current = points;
      filterVisible();
    });

    function onCameraChange() {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(filterVisible, getSetting(debounceKey));
    }

    const removeListener = viewer.camera.changed.addEventListener(onCameraChange);

    return () => {
      removeListener();
      clearTimeout(debounceRef.current);
      controller.abort();
    };
  }, [viewer, enabled, filterVisible, fetchFn, debounceKey]);

  return pointsMap;
}
