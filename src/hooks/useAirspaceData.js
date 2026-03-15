import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchAllAirspaces } from '../providers/airspaceService';
import { getSetting } from '../providers/settingsStore';
import { computeBboxFromViewer } from '../utils/bboxUtils';

export function useAirspaceData(viewer, enabled = false) {
  const [zonesMap, setZonesMap] = useState(new Map());
  const allZonesRef = useRef(null);
  const debounceRef = useRef(null);

  const filterVisible = useCallback(() => {
    if (!viewer || viewer.isDestroyed() || !allZonesRef.current) return;
    if (document.hidden) return;

    const carto = viewer.camera.positionCartographic;
    const alt = carto ? carto.height : Infinity;
    if (alt > getSetting('AIRSPACE_MAX_ALT')) {
      setZonesMap(prev => prev.size === 0 ? prev : new Map());
      return;
    }

    const bbox = computeBboxFromViewer(viewer);
    if (!bbox) return;

    const visible = new Map();
    for (const z of allZonesRef.current) {
      if (z.lat >= bbox.south && z.lat <= bbox.north &&
          z.lon >= bbox.west  && z.lon <= bbox.east) {
        visible.set(z.id, z);
      }
    }
    setZonesMap(visible);
  }, [viewer]);

  useEffect(() => {
    if (!viewer || !enabled) {
      setZonesMap(prev => prev.size === 0 ? prev : new Map());
      return;
    }

    const controller = new AbortController();

    fetchAllAirspaces(controller.signal).then(zones => {
      if (controller.signal.aborted || !zones) return;
      allZonesRef.current = zones;
      filterVisible();
    });

    function onCameraChange() {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(filterVisible, getSetting('AIRSPACE_DEBOUNCE_MS'));
    }

    const removeListener = viewer.camera.changed.addEventListener(onCameraChange);

    return () => {
      removeListener();
      clearTimeout(debounceRef.current);
      controller.abort();
    };
  }, [viewer, enabled, filterVisible]);

  return zonesMap;
}
