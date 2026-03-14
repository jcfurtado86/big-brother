import { useEffect, useRef } from 'react';
import { computeBboxFromViewer } from '../utils/bboxUtils';

/**
 * Filtra visibilidade de billboards em tempo real (camera move + type toggle).
 *
 * @param {object}  viewer - Cesium Viewer
 * @param {Array<{
 *   stateRef:  React.MutableRefObject<Map>,
 *   types:     Set|null,
 *   labelKey:  string,            // 'callsign' | 'label'
 * }>} layers
 */
export function useVisibilityFilter(viewer, layers) {
  const layersRef = useRef(layers);
  layersRef.current = layers;

  // Live visibility on camera change — reads layersRef so it never
  // needs to be re-subscribed when types toggle.
  useEffect(() => {
    if (!viewer) return;

    const update = () => {
      const live = computeBboxFromViewer(viewer);
      for (const { stateRef, types, labelKey } of layersRef.current) {
        for (const [, entry] of stateRef.current) {
          const inView = !live ||
            (entry.lon >= live.west  && entry.lon <= live.east &&
             entry.lat >= live.south && entry.lat <= live.north);
          const visible = inView && (types?.has(entry._category) ?? true);
          entry.billboard.show = visible;
          if (entry[labelKey]) entry[labelKey].show = visible;
        }
      }
    };

    const removeListener = viewer.camera.changed.addEventListener(update);
    return () => removeListener();
  }, [viewer]);

  // Re-apply when any type set changes (immediate, no camera move needed).
  // Each Set is a new reference when the user toggles, so we track them directly.
  const typeRefs = layers.map(l => l.types);
  useEffect(() => {
    for (const { stateRef, types, labelKey } of layersRef.current) {
      for (const [, entry] of stateRef.current) {
        const show = types?.has(entry._category) ?? true;
        entry.billboard.show = show;
        if (entry[labelKey]) entry[labelKey].show = show;
      }
    }
  }, typeRefs); // eslint-disable-line react-hooks/exhaustive-deps
}
