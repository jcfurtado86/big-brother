import { useState, useEffect, useRef } from 'react';
import { Cartesian2, Math as CesiumMath } from 'cesium';
import { fetchTelecomTile, getTilesForBbox, loadAllCachedTiles } from '../providers/telecomService';

const DEBOUNCE_MS = 500;
const MIN_ZOOM = 5;
const MAX_ZOOM = 14;
const MAX_TILES = 40;

function zoomFromAltitude(alt) {
  // Approximate: higher altitude = lower zoom
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
  const loadedTilesRef = useRef(new Set());
  const abortRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!viewer || !enabled) {
      setPointsMap(new Map());
      setLines([]);
      loadedTilesRef.current.clear();
      return;
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
      const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomFromAltitude(alt)));

      const tiles = getTilesForBbox(bbox, zoom);
      if (tiles.length > MAX_TILES) return;

      const newTileKeys = new Set(tiles.map(t => `${t.z}/${t.x}/${t.y}`));
      const toFetch = tiles.filter(t => !loadedTilesRef.current.has(`${t.z}/${t.x}/${t.y}`));

      if (toFetch.length === 0) return;

      const results = await Promise.all(
        toFetch.map(t =>
          fetchTelecomTile(t.z, t.x, t.y, controller.signal).catch(() => null)
        )
      );

      if (controller.signal.aborted) return;

      // Mark loaded
      for (const t of toFetch) {
        loadedTilesRef.current.add(`${t.z}/${t.x}/${t.y}`);
      }

      // Merge new data
      const newPoints = new Map();
      const newLines = [];

      // Keep existing data from still-visible tiles
      for (const key of loadedTilesRef.current) {
        if (!newTileKeys.has(key)) {
          loadedTilesRef.current.delete(key);
        }
      }

      // Re-accumulate from cache
      for (const result of results) {
        if (!result) continue;
        for (const p of result.points) newPoints.set(p.id, p);
        newLines.push(...result.lines);
      }
      // Merge with existing
      setPointsMap(prev => {
        const merged = new Map(prev);
        for (const [id, p] of newPoints) merged.set(id, p);
        return merged;
      });
      setLines(prev => [...prev, ...newLines]);
    }

    function onCameraChange() {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(loadVisibleTiles, DEBOUNCE_MS);
    }

    // Hydrate from IDB cache first (shows previously loaded data immediately)
    loadAllCachedTiles().then(({ points, lines: cachedLines }) => {
      if (points.size > 0) {
        setPointsMap(points);
        setLines(cachedLines);
      }
      // Then fetch fresh tiles for current viewport
      loadVisibleTiles();
    });

    // Re-load on camera move
    const removeListener = viewer.camera.changed.addEventListener(onCameraChange);

    return () => {
      removeListener();
      clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [viewer, enabled]);

  return { pointsMap, lines };
}
