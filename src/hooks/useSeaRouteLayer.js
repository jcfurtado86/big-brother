import { useEffect, useRef } from 'react';
import { Cartesian3, PolylineCollection, Material, Color } from 'cesium';
import { SEA_ROUTE_CATEGORY_META } from '../providers/constants';
import { getSetting } from '../providers/settingsStore';
import { API_URL } from '../utils/api';

let cachedRoutes = null;

async function loadSeaRoutes() {
  if (cachedRoutes) return cachedRoutes;
  const res = await fetch(`${API_URL}/api/routes/sea`);
  if (!res.ok) return null;
  cachedRoutes = await res.json();
  return cachedRoutes;
}

const TYPE_TO_CATEGORY = { Major: 'major', Middle: 'middle', Minor: 'minor' };

const CATS = ['major', 'middle', 'minor'];
const CAT_COLORS = {};
for (const cat of CATS) {
  CAT_COLORS[cat] = Color.fromCssColorString(SEA_ROUTE_CATEGORY_META[cat].color).withAlpha(0.5);
}
function makeMaterial(cat) {
  return Material.fromType('Color', { color: CAT_COLORS[cat] });
}

export function useSeaRouteLayer(viewer, active, visibleTypes) {
  const collectionRef = useRef(null);
  // Store polylines by category for visibility toggling
  const byCategoryRef = useRef({ major: [], middle: [], minor: [] });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const c = collectionRef.current;
      if (c && !c.isDestroyed()) {
        try { c.removeAll(); } catch {}
      }
      collectionRef.current = null;
      byCategoryRef.current = { major: [], middle: [], minor: [] };
    };
  }, []);

  // Build polylines once when activated
  useEffect(() => {
    if (!viewer || !active) {
      if (collectionRef.current && !collectionRef.current.isDestroyed()) {
        try { viewer?.scene.primitives.remove(collectionRef.current); } catch {}
      }
      collectionRef.current = null;
      byCategoryRef.current = { major: [], middle: [], minor: [] };
      try { viewer?.scene.requestRender(); } catch {}
      return;
    }

    let cancelled = false;

    (async () => {
      const routes = await loadSeaRoutes();
      if (cancelled || !routes) return;

      const collection = new PolylineCollection();
      const byCategory = { major: [], middle: [], minor: [] };
      const lineWidth = getSetting('ROUTE_LINE_WIDTH');

      for (const route of routes) {
        const cat = TYPE_TO_CATEGORY[route.name] || 'minor';
        const show = visibleTypes?.has(cat) ?? true;
        const coords = route.coordinates;

        if (!coords || coords.length < 2) continue;
        // Sample every 3rd point
        const sampled = [];
        for (let i = 0; i < coords.length; i += 3) sampled.push(coords[i]);
        if (sampled[sampled.length - 1] !== coords[coords.length - 1]) {
          sampled.push(coords[coords.length - 1]);
        }

        const positions = sampled.map(c => Cartesian3.fromDegrees(c[0], c[1], 0));
        const polyline = collection.add({ positions, width: lineWidth, material: makeMaterial(cat), show });
        byCategory[cat].push(polyline);
      }

      if (cancelled) { collection.destroy(); return; }

      viewer.scene.primitives.add(collection);
      collectionRef.current = collection;
      byCategoryRef.current = byCategory;
      viewer.scene.requestRender();
    })();

    return () => {
      cancelled = true;
      if (collectionRef.current && !collectionRef.current.isDestroyed()) {
        try { viewer.scene.primitives.remove(collectionRef.current); } catch {}
      }
      collectionRef.current = null;
      byCategoryRef.current = { major: [], middle: [], minor: [] };
    };
  }, [viewer, active]);

  // Toggle visibility per category
  useEffect(() => {
    if (!collectionRef.current || collectionRef.current.isDestroyed()) return;
    const byCategory = byCategoryRef.current;
    for (const cat of ['major', 'middle', 'minor']) {
      const show = visibleTypes?.has(cat) ?? true;
      for (const p of byCategory[cat]) p.show = show;
    }
    viewer?.scene.requestRender();
  }, [viewer, visibleTypes]);
}
