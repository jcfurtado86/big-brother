import { useEffect, useRef } from 'react';
import { Rectangle as CesiumRectangle, Color, CallbackProperty } from 'cesium';
import { API_URL } from '../utils/api';

const GRID_SIZE = 2; // must match server
const REFRESH_MS = 5 * 60 * 1000;

function tensionColor(t) {
  // green(0) -> yellow(0.3) -> orange(0.6) -> red(1.0)
  if (t <= 0.3) {
    const f = t / 0.3;
    return new Color(f, 1.0, 0.0); // green → yellow
  }
  if (t <= 0.6) {
    const f = (t - 0.3) / 0.3;
    return new Color(1.0, 1.0 - f * 0.5, 0.0); // yellow → orange
  }
  const f = (t - 0.6) / 0.4;
  return new Color(1.0, 0.5 - f * 0.5, 0.0); // orange → red
}

function removeEntities(viewer, list) {
  for (const e of list) viewer.entities.remove(e);
  list.length = 0;
}

export function useTensionLayer(viewer, active, opacity = 0.5, period = '7d') {
  const entitiesRef = useRef([]);
  const intervalRef = useRef(null);
  const opacityRef = useRef(opacity);
  const dataRef = useRef([]);
  opacityRef.current = opacity;

  // Re-render when opacity changes
  useEffect(() => {
    if (viewer && active) viewer.scene.requestRender();
  }, [viewer, active, opacity]);

  useEffect(() => {
    if (!viewer || !active) return;

    let cancelled = false;

    async function update() {
      try {
        const res = await fetch(`${API_URL}/api/heatmap/tension?period=${period}`);
        if (!res.ok) return;
        const cells = await res.json();
        if (cancelled) return;
        dataRef.current = cells;

        removeEntities(viewer, entitiesRef.current);

        const half = GRID_SIZE / 2;
        for (const cell of cells) {
          const col = tensionColor(cell.tension);
          const entity = viewer.entities.add({
            rectangle: {
              coordinates: CesiumRectangle.fromDegrees(
                cell.lng - half,
                cell.lat - half,
                cell.lng + half,
                cell.lat + half,
              ),
              height: 0,
              material: new CallbackProperty(
                () => col.withAlpha(cell.tension * opacityRef.current),
                false,
              ),
            },
          });
          entitiesRef.current.push(entity);
        }
        viewer.scene.requestRender();
      } catch (e) {
        console.error('[tension] fetch error:', e.message);
      }
    }

    update();
    intervalRef.current = setInterval(update, REFRESH_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      removeEntities(viewer, entitiesRef.current);
    };
  }, [viewer, active, period]);
}
