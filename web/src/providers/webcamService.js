import { idbGet, idbSet } from '../utils/idbCache';
import { computeBboxFromViewer } from '../utils/bboxUtils';
import { API_URL } from '../utils/api';
import { parseWebcam } from './webcamUtils';

const IDB_STORE = 'webcams';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h per tile

// In-memory accumulated cache: Map<id, webcam>
let memoryCache = new Map();
const MEMORY_TTL_MS = 30 * 60 * 1000; // 30min before allowing re-fetches of same tiles

// Track which bbox tiles we've already fetched (avoid re-fetching)
const fetchedTiles = new Map(); // key → timestamp

function bboxKey(bbox) {
  // Round to 1 decimal to create stable tile keys
  const s = Math.floor(bbox.south);
  const w = Math.floor(bbox.west);
  const n = Math.ceil(bbox.north);
  const e = Math.ceil(bbox.east);
  return `windy:${s}_${w}_${n}_${e}`;
}

/**
 * Fetch webcams visible in the current viewer bbox.
 * Accumulates results in memory + IDB cache.
 */
export async function fetchWebcamsForViewer(viewer, signal) {
  if (!viewer || viewer.isDestroyed()) return [];

  const bbox = computeBboxFromViewer(viewer);
  if (!bbox) return [];

  const key = bboxKey(bbox);
  const now = Date.now();

  // Check if we already fetched this tile recently
  const lastFetch = fetchedTiles.get(key);
  if (lastFetch && (now - lastFetch) < MEMORY_TTL_MS) {
    return [...memoryCache.values()];
  }

  // Check IDB cache for this tile
  const cached = await idbGet(IDB_STORE, key);
  if (cached && (now - cached.ts) < CACHE_TTL_MS) {
    // Merge IDB results into memory cache
    for (const wc of cached.data) {
      memoryCache.set(wc.id, wc);
    }
    fetchedTiles.set(key, now);
    console.log('[webcams] IDB cache hit for tile', key, '-', cached.data.length, 'cameras');
    return [...memoryCache.values()];
  }

  // Fetch from API
  console.log('[webcams] Fetching tile', key);
  try {
    const url = `${API_URL}/api/webcams?bbox=${bbox.south},${bbox.west},${bbox.north},${bbox.east}&providers=windy`;
    const res = await fetch(url, { signal });
    if (!res.ok) {
      console.warn('[webcams] API error:', res.status);
      return [...memoryCache.values()];
    }

    const rows = await res.json();
    const parsed = rows.map(parseWebcam).filter(w => w.lat != null && w.lon != null);

    // Save to IDB
    idbSet(IDB_STORE, key, { ts: now, data: parsed });

    // Merge into memory cache
    for (const wc of parsed) {
      memoryCache.set(wc.id, wc);
    }
    fetchedTiles.set(key, now);

    console.log('[webcams] Fetched', parsed.length, 'cameras for tile', key,
      '| Total cached:', memoryCache.size);

    return [...memoryCache.values()];
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    console.error('[webcams] fetch error:', e);
    return [...memoryCache.values()];
  }
}

/**
 * Load all cached webcams from IDB (startup hydration).
 */
export async function loadWebcamCache() {
  try {
    const { idbGetAllEntries } = await import('../utils/idbCache');
    const entries = await idbGetAllEntries(IDB_STORE);
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of entries) {
      if (!key.startsWith('windy:')) continue;
      if (!entry?.data || (now - entry.ts) > CACHE_TTL_MS) continue;
      for (const wc of entry.data) {
        memoryCache.set(wc.id, wc);
        count++;
      }
      fetchedTiles.set(key, entry.ts);
    }

    if (count > 0) {
      console.log('[webcams] Loaded', count, 'cameras from IDB cache');
    }
    return [...memoryCache.values()];
  } catch {
    return [];
  }
}
