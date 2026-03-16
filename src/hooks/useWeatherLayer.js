import { useEffect, useRef } from 'react';
import { Rectangle as CesiumRectangle, ImageMaterialProperty, Color, CallbackProperty } from 'cesium';
import { getSetting } from '../providers/settingsStore';
import { API_URL } from '../utils/api';

const LAYERS = [
  { layer: 'clouds_new', alt: 25_000 },
];

/* ── tile cache (persiste entre toggle on/off) ─────────────── */

// key → { blobUrl, fetchedAt }
const tileCache = new Map();

function tileCacheKey(layerName, x, y, z) {
  return `${layerName}/${z ?? getSetting('WEATHER_ZOOM')}/${x}/${y}`;
}

function boostAlpha(blob) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const id = ctx.getImageData(0, 0, c.width, c.height);
      const d = id.data;
      for (let i = 3; i < d.length; i += 4) {
        d[i] = Math.min(255, d[i] * 3);
      }
      ctx.putImageData(id, 0, 0);
      c.toBlob((b) => resolve(b), 'image/png');
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(blob);
  });
}

async function fetchTileBlob(layerName, x, y, zoom) {
  const key = tileCacheKey(layerName, x, y, zoom);
  const cached = tileCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < getSetting('WEATHER_REFRESH_MS')) {
    return cached.blobUrl;
  }

  const url = `${API_URL}/api/weather/tile/${layerName}/${zoom}/${x}/${y}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return cached?.blobUrl ?? url;
    const raw = await res.blob();
    const boosted = await boostAlpha(raw);

    if (cached?.blobUrl) URL.revokeObjectURL(cached.blobUrl);

    const blobUrl = URL.createObjectURL(boosted);
    tileCache.set(key, { blobUrl, fetchedAt: Date.now() });
    return blobUrl;
  } catch {
    return cached?.blobUrl ?? url;
  }
}

async function fetchAllTiles() {
  const zoom = getSetting('WEATHER_ZOOM');
  const n = 1 << zoom;
  const promises = [];
  for (const { layer } of LAYERS) {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        promises.push(fetchTileBlob(layer, x, y, zoom));
      }
    }
  }
  return Promise.all(promises);
}

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

function addCachedEntities(viewer, list, opacityRef) {
  const zoom = getSetting('WEATHER_ZOOM');
  const n = 1 << zoom;
  for (const { layer, alt } of LAYERS) {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const key = tileCacheKey(layer, x, y, zoom);
        const cached = tileCache.get(key);
        if (!cached) continue;

        const b = tileBounds(zoom, x, y);
        const entity = viewer.entities.add({
          rectangle: {
            coordinates: CesiumRectangle.fromDegrees(b.west, b.south, b.east, b.north),
            height: alt,
            material: new ImageMaterialProperty({
              image: cached.blobUrl,
              transparent: true,
              color: new CallbackProperty(() => Color.WHITE.withAlpha(opacityRef.current), false),
            }),
          },
        });
        list.push(entity);
      }
    }
  }
}

/* ── hook ───────────────────────────────────────────────────── */

export function useWeatherLayer(viewer, active, opacity = 0.5) {
  const entitiesRef  = useRef([]);
  const intervalRef  = useRef(null);
  const opacityRef   = useRef(opacity);
  opacityRef.current = opacity;

  // Trigger render when opacity slider changes
  useEffect(() => {
    if (viewer && active) viewer.scene.requestRender();
  }, [viewer, active, opacity]);

  // Rebuild tiles quando liga/desliga ou viewer muda
  useEffect(() => {
    if (!viewer || !active) return;

    let cancelled = false;

    async function update() {
      if (document.hidden) return;
      await fetchAllTiles();
      if (cancelled) return;

      removeEntities(viewer, entitiesRef.current);
      addCachedEntities(viewer, entitiesRef.current, opacityRef);
    }

    update();
    intervalRef.current = setInterval(update, getSetting('WEATHER_REFRESH_MS'));

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      removeEntities(viewer, entitiesRef.current);
    };
  }, [viewer, active]);
}
