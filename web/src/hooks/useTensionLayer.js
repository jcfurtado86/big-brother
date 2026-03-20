import { useEffect, useRef, useState } from 'react';
import { SingleTileImageryProvider, Rectangle, ImageryLayer } from 'cesium';
import { API_URL } from '../utils/api';

const GRID_SIZE = 2; // degrees — must match server
const REFRESH_MS = 5 * 60 * 1000;
const DEBOUNCE_MS = 2000;

// Canvas resolution: 1px = 1 degree
const W = 360;
const H = 180;
const CIRCLE_R = GRID_SIZE * 1.5; // radius in degrees — overlap zone

function tensionRgb(t) {
  let r, g;
  if (t <= 0.3) {
    const f = t / 0.3;
    r = Math.round(f * 255); g = 255;
  } else if (t <= 0.6) {
    const f = (t - 0.3) / 0.3;
    r = 255; g = Math.round((1.0 - f * 0.5) * 255);
  } else {
    const f = (t - 0.6) / 0.4;
    r = 255; g = Math.round((0.5 - f * 0.5) * 255);
  }
  return { r, g, b: 0 };
}

function renderHeatmapCanvas(cells) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Each cell draws a radial gradient circle — overlapping areas blend additively
  for (const cell of cells) {
    const cx = cell.lng + 180; // 0..360
    const cy = 90 - cell.lat;  // 0..180 (flip Y: north=0)
    const r = CIRCLE_R;
    const { r: cr, g: cg, b: cb } = tensionRgb(cell.tension);
    const alpha = cell.tension * 0.7;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, `rgba(${cr},${cg},${cb},${alpha})`);
    grad.addColorStop(0.5, `rgba(${cr},${cg},${cb},${alpha * 0.5})`);
    grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

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
  const layerRef = useRef(null);
  const intervalRef = useRef(null);
  const opacityRef = useRef(opacity);
  opacityRef.current = opacity;
  const blobUrlRef = useRef(null);

  const debouncedDay = useDebouncedDay(refDate);

  // Update opacity without re-fetching
  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.alpha = opacityRef.current;
      if (viewer) viewer.scene.requestRender();
    }
  }, [viewer, opacity]);

  useEffect(() => {
    if (!viewer || !active) return;

    let cancelled = false;

    function removeLayer() {
      if (layerRef.current) {
        viewer.imageryLayers.remove(layerRef.current, true);
        layerRef.current = null;
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    }

    async function update() {
      try {
        const params = new URLSearchParams({ period });
        if (debouncedDay) params.set('refDate', debouncedDay);

        const res = await fetch(`${API_URL}/api/heatmap/tension?${params}`);
        if (!res.ok) return;
        const cells = await res.json();
        if (cancelled) return;

        const canvas = renderHeatmapCanvas(cells);

        // Convert canvas to blob URL for imagery provider
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (cancelled) return;

        removeLayer();

        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;

        const provider = await SingleTileImageryProvider.fromUrl(url, {
          rectangle: Rectangle.fromDegrees(-180, -90, 180, 90),
        });
        if (cancelled) return;

        const layer = viewer.imageryLayers.addImageryProvider(provider);
        layer.alpha = opacityRef.current;
        layerRef.current = layer;
        viewer.scene.requestRender();
      } catch (e) {
        console.error('[tension] fetch error:', e.message);
      }
    }

    update();
    if (!debouncedDay) {
      intervalRef.current = setInterval(update, REFRESH_MS);
    }

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      removeLayer();
    };
  }, [viewer, active, period, debouncedDay]);
}
