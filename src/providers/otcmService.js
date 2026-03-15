import { idbGet, idbSet } from '../utils/idbCache';

const IDB_STORE = 'webcams';
const IDB_KEY = 'otcm_all';
const DATA_URL = 'https://raw.githubusercontent.com/AidanWelch/OpenTrafficCamMap/master/cameras/USA.json';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (static dataset)

let memoryCache = null;

/**
 * Parse OTCM nested structure into flat array of normalized webcam objects.
 */
function parseOtcm(data) {
  const results = [];
  for (const [state, cities] of Object.entries(data)) {
    for (const [city, cameras] of Object.entries(cities)) {
      for (const cam of cameras) {
        if (cam.latitude == null || cam.longitude == null) continue;
        const id = `webcam_otcm_${cam.latitude}_${cam.longitude}_${results.length}`;
        const isStream = cam.format === 'M3U8';
        results.push({
          id,
          webcamId: id,
          lat: cam.latitude,
          lon: cam.longitude,
          category: isStream ? 'live' : 'timelapse',
          title: cam.description || '',
          city: city !== 'other' ? city : '',
          region: state,
          country: 'United States',
          countryCode: 'US',
          provider: 'OpenTrafficCam',
          status: 'active',
          playerUrl: null,
          playerFallbackUrl: null,
          imageUrl: cam.format === 'IMAGE_STREAM' ? cam.url : null,
          streamUrl: cam.format === 'M3U8' ? cam.url : null,
          thumbnailUrl: null,
          direction: cam.direction ?? null,
          format: cam.format,
        });
      }
    }
  }
  return results;
}

/**
 * Fetch all OTCM cameras. Cached in IDB for 7 days.
 */
export async function fetchOtcmCameras() {
  if (memoryCache) return memoryCache;

  // Check IDB
  const cached = await idbGet(IDB_STORE, IDB_KEY);
  if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) {
    memoryCache = cached.data;
    console.log('[otcm] IDB cache hit:', cached.data.length, 'cameras');
    return memoryCache;
  }

  // Fetch from GitHub
  console.log('[otcm] Fetching from GitHub...');
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) {
      console.warn('[otcm] fetch error:', res.status);
      return memoryCache ?? [];
    }
    const raw = await res.json();
    const parsed = parseOtcm(raw);

    memoryCache = parsed;
    idbSet(IDB_STORE, IDB_KEY, { ts: Date.now(), data: parsed });
    console.log('[otcm] Fetched', parsed.length, 'cameras');
    return parsed;
  } catch (e) {
    console.error('[otcm] error:', e);
    return memoryCache ?? [];
  }
}
