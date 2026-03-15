import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchAllAtc } from '../providers/atcService';
import { getSetting } from '../providers/settingsStore';
import { computeBboxFromViewer } from '../utils/bboxUtils';

export function useAtcData(viewer, enabled = false) {
  const [pointsMap, setPointsMap] = useState(new Map());
  const allPointsRef = useRef(null);
  const debounceRef = useRef(null);

  const filterVisible = useCallback(() => {
    if (!viewer || viewer.isDestroyed() || !allPointsRef.current) return;
    if (document.hidden) return;

    const carto = viewer.camera.positionCartographic;
    const alt = carto ? carto.height : Infinity;
    if (alt > getSetting('ATC_MAX_ALT')) {
      console.log('[ATC] Altitude', Math.round(alt), '> MAX_ALT', getSetting('ATC_MAX_ALT'), '— ocultando');
      setPointsMap(prev => prev.size === 0 ? prev : new Map());
      return;
    }

    const bbox = computeBboxFromViewer(viewer);
    if (!bbox) {
      console.log('[ATC] Bbox inválida');
      return;
    }

    const visible = new Map();
    for (const p of allPointsRef.current) {
      if (p.lat >= bbox.south && p.lat <= bbox.north &&
          p.lon >= bbox.west  && p.lon <= bbox.east) {
        visible.set(p.id, p);
      }
    }
    console.log('[ATC] filterVisible:', visible.size, '/', allPointsRef.current.length, 'pontos no viewport');
    setPointsMap(visible);
  }, [viewer]);

  useEffect(() => {
    if (!viewer || !enabled) {
      setPointsMap(prev => prev.size === 0 ? prev : new Map());
      return;
    }

    const controller = new AbortController();

    console.log('[ATC] useAtcData: enabled, iniciando fetch...');
    fetchAllAtc(controller.signal).then(points => {
      if (controller.signal.aborted || !points) return;
      console.log('[ATC] useAtcData: recebeu', points.length, 'pontos, filtrando viewport...');
      allPointsRef.current = points;
      filterVisible();
    });

    function onCameraChange() {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(filterVisible, getSetting('ATC_DEBOUNCE_MS'));
    }

    const removeListener = viewer.camera.changed.addEventListener(onCameraChange);

    return () => {
      removeListener();
      clearTimeout(debounceRef.current);
      controller.abort();
    };
  }, [viewer, enabled, filterVisible]);

  return pointsMap;
}
