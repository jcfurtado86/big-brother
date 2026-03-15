import { idbGet, idbSet } from '../utils/idbCache';
import { computeBboxFromViewer } from '../utils/bboxUtils';

const IDB_STORE = 'webcams';
const API_KEY = import.meta.env.VITE_WINDY_WEBCAMS_KEY;
const BASE_URL = 'https://api.windy.com/webcams/api/v3/webcams';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h per tile
const MAX_PER_REQUEST = 50;
const MAX_OFFSET = 1000;

// In-memory accumulated cache: Map<id, webcam>
let memoryCache = new Map();
let memoryCacheTs = 0;
const MEMORY_TTL_MS = 30 * 60 * 1000; // 30min before allowing re-fetches of same tiles

// Track which bbox tiles we've already fetched (avoid re-fetching)
const fetchedTiles = new Map(); // key → timestamp

function bboxKey(bbox) {
  // Round to 1 decimal to create stable tile keys
  const s = Math.floor(bbox.south);
  const w = Math.floor(bbox.west);
  const n = Math.ceil(bbox.north);
  const e = Math.ceil(bbox.east);
  return `${s}_${w}_${n}_${e}`;
}

/**
 * Fetch webcams from Windy API for a given bbox.
 * Paginates up to MAX_OFFSET to get all results in the area.
 */
async function fetchBbox(bbox, signal) {
  const results = [];
  let offset = 0;
  // Center of bbox for nearby search (max 250km radius)
  const centerLat = ((bbox.south + bbox.north) / 2).toFixed(4);
  const centerLon = ((bbox.west + bbox.east) / 2).toFixed(4);
  const radius = Math.min(250, Math.max(10,
    Math.round(Math.abs(bbox.north - bbox.south) * 111 / 2)
  ));

  while (offset <= MAX_OFFSET) {
    const params = new URLSearchParams({
      offset: String(offset),
      limit: String(MAX_PER_REQUEST),
      include: 'location,images,player',
      nearby: `${centerLat},${centerLon},${radius}`,
    });

    const res = await fetch(`${BASE_URL}?${params}`, {
      signal,
      headers: { 'x-windy-api-key': API_KEY },
    });

    if (!res.ok) {
      console.warn('[webcams] API error:', res.status);
      break;
    }

    const json = await res.json();
    const webcams = json.webcams ?? [];
    results.push(...webcams);

    // No more pages
    if (webcams.length < MAX_PER_REQUEST) break;
    offset += MAX_PER_REQUEST;
  }

  return results;
}

/**
 * Parse Windy API response into normalized point objects.
 */
function categorizeWebcam(wc) {
  if (wc.status !== 'active') return 'inactive';
  // player field from API: if live is available (object or URL string), it's a live cam
  const p = wc.player;
  if (p?.live?.available || (typeof p?.live === 'string' && p.live)) return 'live';
  return 'timelapse';
}

function parseWebcam(wc) {
  const loc = wc.location ?? {};
  const wcId = wc.webcamId ?? wc.id;
  const category = categorizeWebcam(wc);
  return {
    id: `webcam_${wcId}`,
    webcamId: wcId,
    lat: loc.latitude ?? wc.latitude,
    lon: loc.longitude ?? wc.longitude,
    category,
    title: wc.title ?? '',
    city: loc.city ?? '',
    region: loc.region ?? '',
    country: loc.country ?? '',
    countryCode: loc.countryCode ?? '',
    status: wc.status ?? 'unknown',
    playerUrl: `https://webcams.windy.com/webcams/public/embed/player/${wcId}/${category === 'live' ? 'live' : 'day'}`,
    playerFallbackUrl: `https://webcams.windy.com/webcams/public/embed/player/${wcId}/day`,
    imageUrl: wc.images?.current?.preview ?? wc.images?.daylight?.preview ?? null,
    thumbnailUrl: wc.images?.current?.thumbnail ?? wc.images?.daylight?.thumbnail ?? null,
  };
}

/**
 * Fetch webcams visible in the current viewer bbox.
 * Accumulates results in memory + IDB cache.
 */
export async function fetchWebcamsForViewer(viewer, signal) {
  if (!API_KEY) {
    console.warn('[webcams] VITE_WINDY_WEBCAMS_KEY not set');
    return [];
  }

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
    const raw = await fetchBbox(bbox, signal);
    const parsed = raw.map(parseWebcam).filter(w => w.lat != null && w.lon != null);

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
