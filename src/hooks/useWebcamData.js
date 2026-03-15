import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchWebcamsForViewer, loadWebcamCache } from '../providers/webcamService';
import { fetchOtcmCameras } from '../providers/otcmService';
import { fetchDotCameras } from '../providers/dotService';
import { computeBboxFromViewer } from '../utils/bboxUtils';
import { getSetting } from '../providers/settingsStore';
import { useLoading } from '../contexts/LoadingContext';

/**
 * Fetch cameras from the selected provider(s).
 * 'all' merges every provider in parallel.
 */
async function fetchByProvider(provider, viewer, signal) {
  const fetchers = {
    windy: () => fetchWebcamsForViewer(viewer, signal),
    otcm:  () => fetchOtcmCameras(),
    dot:   () => fetchDotCameras(),
  };

  if (provider === 'all') {
    const results = await Promise.all(
      Object.values(fetchers).map(fn => fn().catch(() => []))
    );
    return results.flat();
  }

  return fetchers[provider]?.() ?? [];
}

/**
 * Hydrate caches for the selected provider(s).
 */
function hydrateByProvider(provider) {
  const hydrators = {
    windy: () => loadWebcamCache(),
    otcm:  () => fetchOtcmCameras(),
    dot:   () => fetchDotCameras(),
  };

  if (provider === 'all') {
    return Promise.all(
      Object.values(hydrators).map(fn => fn().catch(() => {}))
    );
  }

  return hydrators[provider]?.() ?? Promise.resolve();
}

/**
 * Webcam data hook — fetches from selected provider based on current viewport.
 * Provider can be 'windy', 'otcm', or 'all'.
 */
export function useWebcamData(viewer, enabled = false, provider = 'windy') {
  const [pointsMap, setPointsMap] = useState(new Map());
  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  const { start: loadStart, done: loadDone } = useLoading();

  const fetchVisible = useCallback(async () => {
    if (!viewer || viewer.isDestroyed()) return;
    if (document.hidden) return;

    const carto = viewer.camera.positionCartographic;
    const alt = carto ? carto.height : Infinity;
    if (alt > getSetting('WEBCAM_MAX_ALT')) {
      setPointsMap(prev => prev.size === 0 ? prev : new Map());
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    loadStart();
    try {
      const all = await fetchByProvider(provider, viewer, controller.signal);
      if (controller.signal.aborted) return;

      // Filter to visible bbox
      const bbox = computeBboxFromViewer(viewer);
      if (!bbox) return;

      const visible = new Map();
      for (const p of all) {
        if (p.lat >= bbox.south && p.lat <= bbox.north &&
            p.lon >= bbox.west  && p.lon <= bbox.east) {
          visible.set(p.id, p);
        }
      }

      setPointsMap(prev => {
        if (prev.size !== visible.size) return visible;
        for (const k of prev.keys()) {
          if (!visible.has(k)) return visible;
        }
        return prev;
      });
    } catch (e) {
      if (e.name !== 'AbortError') console.error('[webcams] error:', e);
    } finally {
      loadDone();
    }
  }, [viewer, provider, loadStart, loadDone]);

  useEffect(() => {
    if (!viewer || !enabled) {
      setPointsMap(prev => prev.size === 0 ? prev : new Map());
      return;
    }

    // Clear old provider data immediately on switch
    setPointsMap(prev => prev.size === 0 ? prev : new Map());

    // Hydrate from cache on mount
    loadStart();
    hydrateByProvider(provider).then(() => {
      fetchVisible();
    }).finally(() => loadDone());

    function onCameraChange() {
      // Immediately clear if above altitude threshold
      const carto = viewer.camera.positionCartographic;
      const alt = carto ? carto.height : Infinity;
      if (alt > getSetting('WEBCAM_MAX_ALT')) {
        clearTimeout(debounceRef.current);
        setPointsMap(prev => prev.size === 0 ? prev : new Map());
        return;
      }
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(fetchVisible, getSetting('WEBCAM_DEBOUNCE_MS'));
    }

    const removeListener = viewer.camera.changed.addEventListener(onCameraChange);

    return () => {
      removeListener();
      clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [viewer, enabled, provider, fetchVisible]);

  return pointsMap;
}
