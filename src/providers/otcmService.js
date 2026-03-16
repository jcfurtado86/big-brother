import { idbGet, idbSet } from '../utils/idbCache';
import { API_URL } from '../utils/api';
import { parseWebcam } from './webcamUtils';

const IDB_STORE = 'webcams';
const IDB_KEY = 'otcm:all';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (static dataset)

let memoryCache = null;

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

  console.log('[otcm] Fetching from API...');
  try {
    const res = await fetch(`${API_URL}/api/webcams?bbox=-90,-180,90,180&providers=otcm`);
    if (!res.ok) {
      console.warn('[otcm] API error:', res.status);
      return memoryCache ?? [];
    }
    const rows = await res.json();
    const parsed = rows.map(parseWebcam);

    memoryCache = parsed;
    idbSet(IDB_STORE, IDB_KEY, { ts: Date.now(), data: parsed });
    console.log('[otcm] Fetched', parsed.length, 'cameras');
    return parsed;
  } catch (e) {
    console.error('[otcm] error:', e);
    return memoryCache ?? [];
  }
}
