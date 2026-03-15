import Pbf from 'pbf';
import { VectorTile } from '@mapbox/vector-tile';
import { idbGet, idbSet, idbGetAllEntries, idbPurgeExpired } from '../utils/idbCache';
import { TELECOM_TTL_MS, TELECOM_MAX_CACHE } from './constants';

const TELECOM_LAYERS = ['telecoms_mast', 'telecoms_data_center', 'telecoms_communication_line'];
const TILE_URL = '/api/openinframap/tiles/{z}/{x}/{y}.pbf';
const IDB_STORE = 'telecom';

// ── Tile coordinate math ─────────────────────────────────────────────────────

export function lonLatToTile(lon, lat, zoom) {
  const n = 1 << zoom;
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}

export function getTilesForBbox(bbox, zoom) {
  const tl = lonLatToTile(bbox.west, bbox.north, zoom);
  const br = lonLatToTile(bbox.east, bbox.south, zoom);
  const tiles = [];
  for (let x = tl.x; x <= br.x; x++) {
    for (let y = tl.y; y <= br.y; y++) {
      tiles.push({ z: zoom, x, y });
    }
  }
  return tiles;
}

// ── Fetch + decode ───────────────────────────────────────────────────────────

const tileCache = new Map();

function tileKey(z, x, y) { return `${z}/${x}/${y}`; }

export async function fetchTelecomTile(z, x, y, signal) {
  const key = tileKey(z, x, y);
  if (tileCache.has(key)) return tileCache.get(key);

  // Check IDB cache
  const cached = await idbGet(IDB_STORE, key);
  if (cached && (Date.now() - cached.ts) < TELECOM_TTL_MS) {
    memCachePut(key, cached.data);
    return cached.data;
  }

  const url = TILE_URL.replace('{z}', z).replace('{x}', x).replace('{y}', y);
  const res = await fetch(url, { signal });
  if (!res.ok) return null;

  const buf = await res.arrayBuffer();
  const tile = new VectorTile(new Pbf(buf));
  const features = parseTelecomTile(tile, z, x, y);

  memCachePut(key, features);
  idbSet(IDB_STORE, key, { ts: Date.now(), data: features });
  return features;
}

function memCachePut(key, data) {
  if (tileCache.size >= TELECOM_MAX_CACHE) {
    const oldest = tileCache.keys().next().value;
    tileCache.delete(oldest);
  }
  tileCache.set(key, data);
}

// Load all cached tiles from IDB (for hydrating on startup)
export async function loadAllCachedTiles() {
  // Purge expired entries first
  idbPurgeExpired(IDB_STORE, TELECOM_TTL_MS);

  const entries = await idbGetAllEntries(IDB_STORE);
  const now = Date.now();
  const points = new Map();
  const lines = [];

  for (const [key, cached] of entries) {
    if ((now - cached.ts) >= TELECOM_TTL_MS) continue; // skip any still in flight
    memCachePut(key, cached.data);
    for (const p of cached.data.points) points.set(p.id, p);
    lines.push(...cached.data.lines);
  }

  return { points, lines };
}

// ── Parse MVT features → normalized objects ──────────────────────────────────

function tileToLonLat(tileX, tileY, zoom, extent, px, py) {
  const n = 1 << zoom;
  const lon = ((tileX + px / extent) / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * (tileY + py / extent)) / n)));
  const lat = (latRad * 180) / Math.PI;
  return { lon, lat };
}

function parseTelecomTile(tile, z, x, y) {
  const points = [];
  const lines = [];

  for (const layerName of TELECOM_LAYERS) {
    const layer = tile.layers[layerName];
    if (!layer) continue;

    const isLine = layerName === 'telecoms_communication_line';

    for (let i = 0; i < layer.length; i++) {
      const feature = layer.feature(i);
      const props = feature.properties;
      const geomType = feature.type; // 1=point, 2=line, 3=polygon

      if (geomType === 1) {
        // Point feature (masts, data centers)
        const coords = feature.loadGeometry()[0][0];
        const { lon, lat } = tileToLonLat(x, y, z, layer.extent, coords.x, coords.y);
        points.push({
          id: `${layerName}_${z}_${x}_${y}_${i}`,
          lon, lat,
          layer: layerName,
          name: props.name || props.operator || '',
          operator: props.operator || '',
          ...props,
        });
      } else if (geomType === 2 && isLine) {
        // Line feature (communication lines)
        const geometry = feature.loadGeometry();
        for (const ring of geometry) {
          const coords = ring.map(p => tileToLonLat(x, y, z, layer.extent, p.x, p.y));
          if (coords.length >= 2) {
            lines.push({
              id: `${layerName}_${z}_${x}_${y}_${i}`,
              coords,
              layer: layerName,
              name: props.name || props.operator || '',
              operator: props.operator || '',
              ...props,
            });
          }
        }
      } else if (geomType === 3 && !isLine) {
        // Polygon feature (data centers as areas) — use centroid
        const geometry = feature.loadGeometry()[0];
        if (geometry.length > 0) {
          let cx = 0, cy = 0;
          for (const p of geometry) { cx += p.x; cy += p.y; }
          cx /= geometry.length;
          cy /= geometry.length;
          const { lon, lat } = tileToLonLat(x, y, z, layer.extent, cx, cy);
          points.push({
            id: `${layerName}_${z}_${x}_${y}_${i}`,
            lon, lat,
            layer: layerName,
            name: props.name || props.operator || '',
            operator: props.operator || '',
            ...props,
          });
        }
      }
    }
  }

  return { points, lines };
}
