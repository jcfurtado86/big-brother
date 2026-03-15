import { useEffect, useRef } from 'react';
import { Cartesian3, PolylineCollection, Material, Color } from 'cesium';
import { SEA_ROUTE_CATEGORY_META, ROUTE_LINE_WIDTH } from '../providers/constants';

let cachedGeoJSON = null;

async function loadSeaRoutes() {
  if (cachedGeoJSON) return cachedGeoJSON;
  const res = await fetch('/sea-routes.geojson');
  if (!res.ok) return null;
  cachedGeoJSON = await res.json();
  return cachedGeoJSON;
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
      const geojson = await loadSeaRoutes();
      if (cancelled || !geojson) return;

      const collection = new PolylineCollection();
      const byCategory = { major: [], middle: [], minor: [] };

      for (const feature of geojson.features) {
        if (feature.geometry.type !== 'MultiLineString') continue;
        const cat = TYPE_TO_CATEGORY[feature.properties?.Type] || 'minor';
        const show = visibleTypes?.has(cat) ?? true;

        for (const line of feature.geometry.coordinates) {
          if (line.length < 2) continue;
          // Sample every 3rd point
          const sampled = [];
          for (let i = 0; i < line.length; i += 3) sampled.push(line[i]);
          if (sampled[sampled.length - 1] !== line[line.length - 1]) {
            sampled.push(line[line.length - 1]);
          }

          const positions = sampled.map(c => Cartesian3.fromDegrees(c[0], c[1], 0));
          const polyline = collection.add({ positions, width: ROUTE_LINE_WIDTH, material: makeMaterial(cat), show });
          byCategory[cat].push(polyline);
        }
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
