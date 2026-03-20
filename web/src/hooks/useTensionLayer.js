import { useEffect, useRef, useState } from 'react';
import { Cartesian3, Color, CallbackProperty, ColorMaterialProperty } from 'cesium';
import { API_URL } from '../utils/api';

const GRID_SIZE = 2; // degrees — must match server
const RADIUS_M = (GRID_SIZE / 2) * 111_000; // half-cell in meters
const REFRESH_MS = 5 * 60 * 1000;
const DEBOUNCE_MS = 2000; // debounce timeline scrubbing

function tensionColor(t) {
  if (t <= 0.3) {
    const f = t / 0.3;
    return new Color(f, 1.0, 0.0);
  }
  if (t <= 0.6) {
    const f = (t - 0.3) / 0.3;
    return new Color(1.0, 1.0 - f * 0.5, 0.0);
  }
  const f = (t - 0.6) / 0.4;
  return new Color(1.0, 0.5 - f * 0.5, 0.0);
}

function removeEntities(viewer, list) {
  for (const e of list) viewer.entities.remove(e);
  list.length = 0;
}

// Debounce refDate to a daily granularity — only refetch when the day changes
function useDebouncedDay(refDate) {
  const day = refDate ? refDate.slice(0, 10) : null;
  const [debounced, setDebounced] = useState(day);

  useEffect(() => {
    if (day === debounced) return;
    const timer = setTimeout(() => setDebounced(day), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [day, debounced]);

  return debounced;
}

export function useTensionLayer(viewer, active, opacity = 0.5, period = '7d', refDate = null) {
  const entitiesRef = useRef([]);
  const intervalRef = useRef(null);
  const opacityRef = useRef(opacity);
  opacityRef.current = opacity;

  const debouncedDay = useDebouncedDay(refDate);

  // Re-render when opacity changes
  useEffect(() => {
    if (viewer && active) viewer.scene.requestRender();
  }, [viewer, active, opacity]);

  useEffect(() => {
    if (!viewer || !active) return;

    let cancelled = false;

    async function update() {
      try {
        const params = new URLSearchParams({ period });
        if (debouncedDay) params.set('refDate', debouncedDay);

        const res = await fetch(`${API_URL}/api/heatmap/tension?${params}`);
        if (!res.ok) return;
        const cells = await res.json();
        if (cancelled) return;

        removeEntities(viewer, entitiesRef.current);

        for (const cell of cells) {
          const col = tensionColor(cell.tension);
          const entity = viewer.entities.add({
            position: Cartesian3.fromDegrees(cell.lng, cell.lat),
            ellipse: {
              semiMajorAxis: RADIUS_M,
              semiMinorAxis: RADIUS_M,
              height: 0,
              material: new ColorMaterialProperty(
                new CallbackProperty(
                  () => col.withAlpha(cell.tension * opacityRef.current),
                  false,
                ),
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
    // Only auto-refresh when not in timeline mode
    if (!debouncedDay) {
      intervalRef.current = setInterval(update, REFRESH_MS);
    }

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      removeEntities(viewer, entitiesRef.current);
    };
  }, [viewer, active, period, debouncedDay]);
}
