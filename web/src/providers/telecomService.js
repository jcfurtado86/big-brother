import { idbGet, idbSet, idbGetAllEntries, idbPurgeExpired } from '../utils/idbCache';
import { TELECOM_TTL_MS } from './constants';
import { getSetting } from './settingsStore';
import { API_URL } from '../utils/api';

const IDB_STORE = 'telecom';

// ── Tile coordinate math (kept for viewport-based fetching) ──────────────────

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

// ── Tile bounds (reverse: tile coords → bbox) ───────────────────────────────

function tileBounds(z, x, y) {
  const n = 1 << z;
  return {
    west:  (x / n) * 360 - 180,
    east:  ((x + 1) / n) * 360 - 180,
    north: Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * (180 / Math.PI),
    south: Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n))) * (180 / Math.PI),
  };
}

// ── Fetch + cache ────────────────────────────────────────────────────────────

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

  // Compute bbox for this tile and fetch from API
  const b = tileBounds(z, x, y);
  const url = `${API_URL}/api/telecom?bbox=${b.south},${b.west},${b.north},${b.east}`;
  console.log(`[telecom] Fetching tile ${z}/${x}/${y} from API`);
  const res = await fetch(url, { signal });
  if (!res.ok) return null;

  const rows = await res.json();
  const points = [];
  const lines = [];

  for (const r of rows) {
    const meta = r.meta || {};
    const base = {
      id: r.id,
      lat: r.lat,
      lon: r.lon,
      layer: r.layer,
      name: r.name || r.operator || '',
      operator: r.operator || '',
    };

    if (r.layer === 'comm_line' && meta.coords && meta.coords.length >= 2) {
      lines.push({ ...base, coords: meta.coords });
    } else {
      points.push({ ...base, ...meta });
    }
  }

  const features = { points, lines };
  console.log(`[telecom] Tile ${z}/${x}/${y}: ${points.length} points, ${lines.length} lines`);

  memCachePut(key, features);
  idbSet(IDB_STORE, key, { ts: Date.now(), data: features });
  return features;
}

function memCachePut(key, data) {
  if (tileCache.size >= getSetting('TELECOM_MAX_CACHE')) {
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
    if ((now - cached.ts) >= TELECOM_TTL_MS) continue;
    memCachePut(key, cached.data);
    for (const p of cached.data.points) points.set(p.id, p);
    lines.push(...cached.data.lines);
  }

  return { points, lines };
}
