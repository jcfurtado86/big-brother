import { useState, useEffect, useRef } from 'react';
import { Cartesian2, Math as CesiumMath } from 'cesium';
import { fetchTelecomTile, getTilesForBbox, loadAllCachedTiles } from '../providers/telecomService';
import { getSetting } from '../providers/settingsStore';

function zoomFromAltitude(alt) {
  if (alt > 5_000_000) return 3;
  if (alt > 2_000_000) return 5;
  if (alt > 1_000_000) return 6;
  if (alt > 500_000)   return 7;
  if (alt > 200_000)   return 8;
  if (alt > 100_000)   return 9;
  if (alt > 50_000)    return 10;
  if (alt > 20_000)    return 11;
  if (alt > 10_000)    return 12;
  if (alt > 5_000)     return 13;
  return 14;
}

function computeBbox(viewer) {
  const canvas = viewer.scene.canvas;
  const ellipsoid = viewer.scene.globe.ellipsoid;
  const corners = [
    [0, 0], [canvas.width, 0],
    [0, canvas.height], [canvas.width, canvas.height],
    [canvas.width / 2, 0], [canvas.width / 2, canvas.height],
    [0, canvas.height / 2], [canvas.width, canvas.height / 2],
  ];
  let south = 90, north = -90, west = 180, east = -180;
  let valid = 0;
  for (const [x, y] of corners) {
    const cart = viewer.scene.camera.pickEllipsoid(new Cartesian2(x, y), ellipsoid);
    if (!cart) continue;
    const carto = ellipsoid.cartesianToCartographic(cart);
    const lat = CesiumMath.toDegrees(carto.latitude);
    const lon = CesiumMath.toDegrees(carto.longitude);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
    west  = Math.min(west, lon);
    east  = Math.max(east, lon);
    valid++;
  }
  if (valid < 2) return null;
  return { south, north, west, east };
}

export function useTelecom(viewer, enabled = false) {
  const [pointsMap, setPointsMap] = useState(new Map());
  const [lines, setLines] = useState([]);
  const abortRef = useRef(null);
  const debounceRef = useRef(null);

  // Track data per tile: tileKey → { points: Map, lines: [] }
  const tileDataRef = useRef(new Map());

  useEffect(() => {
    if (!viewer || !enabled) {
      setPointsMap(new Map());
      setLines([]);
      tileDataRef.current.clear();
      return;
    }

    function rebuildState() {
      const allPoints = new Map();
      const allLines = [];
      for (const data of tileDataRef.current.values()) {
        for (const [id, p] of data.points) allPoints.set(id, p);
        for (const l of data.lines) allLines.push(l);
      }
      setPointsMap(allPoints);
      setLines(allLines);
    }

    async function loadVisibleTiles() {
      if (document.hidden) return;
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const bbox = computeBbox(viewer);
      if (!bbox) return;

      const carto = viewer.camera.positionCartographic;
      const alt = carto ? carto.height : 1_000_000;
      const zoom = Math.max(getSetting('TELECOM_MIN_ZOOM'), Math.min(getSetting('TELECOM_MAX_ZOOM'), zoomFromAltitude(alt)));

      const tiles = getTilesForBbox(bbox, zoom);
      if (tiles.length > getSetting('TELECOM_MAX_TILES')) return;

      const visibleKeys = new Set(tiles.map(t => `${t.z}/${t.x}/${t.y}`));

      // Evict tiles no longer visible (keep __cache__ until real tiles replace it)
      let evicted = false;
      for (const key of tileDataRef.current.keys()) {
        if (key !== '__cache__' && !visibleKeys.has(key)) {
          tileDataRef.current.delete(key);
          evicted = true;
        }
      }

      // Fetch new tiles
      const toFetch = tiles.filter(t => !tileDataRef.current.has(`${t.z}/${t.x}/${t.y}`));

      if (toFetch.length === 0) {
        if (evicted) rebuildState();
        return;
      }

      const results = await Promise.all(
        toFetch.map(t =>
          fetchTelecomTile(t.z, t.x, t.y, controller.signal).catch(() => null)
        )
      );

      if (controller.signal.aborted) return;

      // Store data per tile
      for (let i = 0; i < toFetch.length; i++) {
        const t = toFetch[i];
        const result = results[i];
        if (!result) continue;

        const key = `${t.z}/${t.x}/${t.y}`;
        const points = new Map();
        for (const p of result.points) points.set(p.id, p);

        tileDataRef.current.set(key, { points, lines: result.lines });
      }

      // Remove IDB cache once real tiles are loaded
      tileDataRef.current.delete('__cache__');

      rebuildState();
    }

    function onCameraChange() {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(loadVisibleTiles, getSetting('TELECOM_DEBOUNCE_MS'));
    }

    // Hydrate from IDB cache first
    loadAllCachedTiles().then(({ points, lines: cachedLines }) => {
      if (points.size > 0) {
        // Store as a single "cache" tile entry
        tileDataRef.current.set('__cache__', { points, lines: cachedLines });
        rebuildState();
      }
      loadVisibleTiles();
    });

    const removeListener = viewer.camera.changed.addEventListener(onCameraChange);

    return () => {
      removeListener();
      clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [viewer, enabled]);

  return { pointsMap, lines };
}
