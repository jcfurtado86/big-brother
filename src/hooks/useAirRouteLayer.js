import { useEffect, useRef, useState } from 'react';
import { Cartesian3, PolylineCollection, Material, Color } from 'cesium';
import {
  AIR_ROUTE_CATEGORY_META, ROUTE_LINE_WIDTH, AIR_ROUTE_ALT,
  FLIGHT_ALT_SCALE,
} from '../providers/constants';

/* ── Great-circle arc ──────────────────────────────────────── */

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function greatCircleArc(lat1, lon1, lat2, lon2, altMeters) {
  const φ1 = lat1 * DEG2RAD, λ1 = lon1 * DEG2RAD;
  const φ2 = lat2 * DEG2RAD, λ2 = lon2 * DEG2RAD;

  const d = Math.acos(
    Math.min(1, Math.max(-1,
      Math.sin(φ1) * Math.sin(φ2) + Math.cos(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1)
    ))
  );
  if (d < 1e-10) return null;

  const degSpan = d * RAD2DEG;
  const n = degSpan < 5 ? 4 : degSpan < 20 ? 10 : degSpan < 60 ? 20 : 30;

  const sinD = Math.sin(d);
  const arr = new Float64Array((n + 1) * 3);
  let idx = 0;

  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / sinD;
    const B = Math.sin(f * d) / sinD;

    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);

    arr[idx++] = Math.atan2(y, x) * RAD2DEG;
    arr[idx++] = Math.atan2(z, Math.sqrt(x * x + y * y)) * RAD2DEG;
    arr[idx++] = altMeters;
  }

  return Cartesian3.fromDegreesArrayHeights(arr);
}

/* ── Haversine distance (km) ──────────────────────────────── */

function haversineKm(lat1, lon1, lat2, lon2) {
  const φ1 = lat1 * DEG2RAD, φ2 = lat2 * DEG2RAD;
  const Δφ = (lat2 - lat1) * DEG2RAD;
  const Δλ = (lon2 - lon1) * DEG2RAD;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceCategory(km) {
  if (km < 1500) return 'short';
  if (km < 5000) return 'medium';
  return 'long';
}

/* ── Load route data ───────────────────────────────────────── */

// Each route: { lat1, lon1, lat2, lon2, category }
let cachedRoutes = null;

async function loadAirRoutes() {
  if (cachedRoutes) return cachedRoutes;

  const [airportsRes, routesRes] = await Promise.all([
    fetch('/airports.json'),
    fetch('/air-routes.json'),
  ]);
  if (!airportsRes.ok || !routesRes.ok) return null;

  const airports = await airportsRes.json();
  const routePairs = await routesRes.json();

  const byIata = new Map();
  for (const a of airports) {
    if (a.iata && a.lat && a.lon) byIata.set(a.iata, a);
  }

  // 5 values per route: srcLat, srcLon, dstLat, dstLon, categoryIndex
  // categoryIndex: 0=short, 1=medium, 2=long
  const CAT_MAP = { short: 0, medium: 1, long: 2 };
  const routes = [];
  for (const [srcIata, dstIata] of routePairs) {
    const src = byIata.get(srcIata);
    const dst = byIata.get(dstIata);
    if (!src || !dst) continue;
    const km = haversineKm(src.lat, src.lon, dst.lat, dst.lon);
    routes.push(src.lat, src.lon, dst.lat, dst.lon, CAT_MAP[distanceCategory(km)]);
  }

  cachedRoutes = routes;
  return routes;
}

/* ── Viewport hit test ─────────────────────────────────────── */

const PADDING = 5;

function routeInBbox(lat1, lon1, lat2, lon2, bbox) {
  if (!bbox) return true;
  const s = bbox.south - PADDING, n = bbox.north + PADDING;
  const w = bbox.west - PADDING, e = bbox.east + PADDING;
  return (lat1 >= s && lat1 <= n && lon1 >= w && lon1 <= e) ||
         (lat2 >= s && lat2 <= n && lon2 >= w && lon2 <= e);
}

/* ── Category colors (materials created per-polyline) ─────── */

const CATS = ['short', 'medium', 'long'];
const CAT_COLORS = CATS.map(cat =>
  Color.fromCssColorString(AIR_ROUTE_CATEGORY_META[cat].color).withAlpha(0.5)
);
function makeMaterial(catIdx) {
  return Material.fromType('Color', { color: CAT_COLORS[catIdx] });
}

/* ── Hook ─────────────────────────────────────────────────── */

const BATCH = 100;
const STRIDE = 5; // values per route

export function useAirRouteLayer(viewer, active, bbox, visibleTypes) {
  const collectionRef = useRef(null);
  const renderedRef = useRef(new Map()); // routeIndex → { polyline, cat }
  const rafRef = useRef(null);
  const routesRef = useRef(null);
  const [dataReady, setDataReady] = useState(false);

  // Cleanup on unmount — remove all polylines so Cesium can safely destroy the empty collection
  useEffect(() => {
    return () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      const c = collectionRef.current;
      if (c && !c.isDestroyed()) {
        try { c.removeAll(); } catch {}
      }
      collectionRef.current = null;
      renderedRef.current.clear();
    };
  }, []);

  // Load data once
  useEffect(() => {
    if (!active) return;
    loadAirRoutes().then(r => {
      if (r) { routesRef.current = r; setDataReady(true); }
    });
  }, [active]);

  // Sync visible routes on bbox change
  useEffect(() => {
    if (!viewer || !active) {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      if (collectionRef.current && !collectionRef.current.isDestroyed()) {
        try { viewer?.scene.primitives.remove(collectionRef.current); } catch {}
      }
      collectionRef.current = null;
      renderedRef.current.clear();
      try { viewer?.scene.requestRender(); } catch {}
      return;
    }

    const routes = routesRef.current;
    if (!routes || routes.length === 0) return;

    if (!collectionRef.current || collectionRef.current.isDestroyed()) {
      const c = new PolylineCollection();
      viewer.scene.primitives.add(c);
      collectionRef.current = c;
    }

    const collection = collectionRef.current;
    const rendered = renderedRef.current;
    const alt = AIR_ROUTE_ALT * FLIGHT_ALT_SCALE;
    const totalRoutes = routes.length / STRIDE;

    // Which routes should be visible (in bbox AND category enabled)
    const shouldBeVisible = new Set();
    for (let i = 0; i < totalRoutes; i++) {
      const idx = i * STRIDE;
      const catIdx = routes[idx + 4];
      const catName = CATS[catIdx];
      if (visibleTypes && !visibleTypes.has(catName)) continue;
      if (routeInBbox(routes[idx], routes[idx + 1], routes[idx + 2], routes[idx + 3], bbox)) {
        shouldBeVisible.add(i);
      }
    }

    // Remove routes that left viewport or whose category was toggled off
    if (!collection.isDestroyed()) {
      for (const [routeIdx, entry] of rendered) {
        if (!shouldBeVisible.has(routeIdx)) {
          try { collection.remove(entry.polyline); } catch {}
          rendered.delete(routeIdx);
        }
      }
    } else {
      rendered.clear();
      return;
    }

    // Routes to add
    const toAdd = [];
    for (const idx of shouldBeVisible) {
      if (!rendered.has(idx)) toAdd.push(idx);
    }

    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }

    if (toAdd.length === 0) {
      viewer.scene.requestRender();
      return;
    }

    let cursor = 0;

    function processBatch() {
      if (collection.isDestroyed()) return;
      const end = Math.min(cursor + BATCH, toAdd.length);

      for (let j = cursor; j < end; j++) {
        const i = toAdd[j];
        const idx = i * STRIDE;
        const catIdx = routes[idx + 4];
        const positions = greatCircleArc(routes[idx], routes[idx + 1], routes[idx + 2], routes[idx + 3], alt);
        if (!positions) continue;
        const polyline = collection.add({
          positions,
          width: ROUTE_LINE_WIDTH,
          material: makeMaterial(catIdx),
        });
        rendered.set(i, { polyline, cat: catIdx });
      }

      cursor = end;
      viewer.scene.requestRender();

      if (cursor < toAdd.length) {
        rafRef.current = requestAnimationFrame(processBatch);
      }
    }

    rafRef.current = requestAnimationFrame(processBatch);

    return () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, [viewer, active, bbox, visibleTypes, dataReady]);
}
