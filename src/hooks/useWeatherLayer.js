import { useEffect, useRef } from 'react';
import { Rectangle as CesiumRectangle, ImageMaterialProperty, Color } from 'cesium';
import { OWM_TILE_URL } from '../providers/constants';

const OWM_KEY    = import.meta.env.VITE_OWM_API_KEY || '';
const ZOOM       = 2;        // 4×4 = 16 tiles per layer
const N          = 1 << ZOOM;
const REFRESH_MS = 60 * 60 * 1000;  // 60 min — keeps under OWM free tier (1000 calls/day)

const LAYERS = [
  { layer: 'clouds_new',       alt: 8_000,  alpha: 0.5 },
  { layer: 'precipitation_new', alt: 12_000, alpha: 0.7 },
];

/* ── helpers ────────────────────────────────────────────────── */

function tileBounds(z, x, y) {
  const n = 1 << z;
  return {
    west:  (x / n) * 360 - 180,
    east:  ((x + 1) / n) * 360 - 180,
    north: Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * (180 / Math.PI),
    south: Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n))) * (180 / Math.PI),
  };
}

function removeEntities(viewer, list) {
  for (const e of list) viewer.entities.remove(e);
  list.length = 0;
}

function addTileEntities(viewer, list, layerName, altitude, alpha) {
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const b = tileBounds(ZOOM, x, y);
      const url = `${OWM_TILE_URL}/${layerName}/${ZOOM}/${x}/${y}.png?appid=${OWM_KEY}`;
      const entity = viewer.entities.add({
        rectangle: {
          coordinates: CesiumRectangle.fromDegrees(b.west, b.south, b.east, b.north),
          height: altitude,
          material: new ImageMaterialProperty({
            image: url,
            transparent: true,
            color: Color.WHITE.withAlpha(alpha),
          }),
        },
      });
      list.push(entity);
    }
  }
}

/* ── hook ───────────────────────────────────────────────────── */

export function useWeatherLayer(viewer, active) {
  const entitiesRef = useRef([]);  // flat list of all entities across layers
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!viewer || !active || !OWM_KEY) return;

    function update() {
      removeEntities(viewer, entitiesRef.current);
      for (const { layer, alt, alpha } of LAYERS) {
        addTileEntities(viewer, entitiesRef.current, layer, alt, alpha);
      }
    }

    update();
    intervalRef.current = setInterval(update, REFRESH_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      removeEntities(viewer, entitiesRef.current);
    };
  }, [viewer, active]);
}
