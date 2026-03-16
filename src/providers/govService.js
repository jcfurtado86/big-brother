import { idbGet, idbSet } from '../utils/idbCache';
import { API_URL } from '../utils/api';
import { parseWebcam } from './webcamUtils';

const IDB_STORE = 'webcams';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h (images update frequently)

let memoryCache = null;

/**
 * Fetch all government cameras worldwide. Cached in IDB for 6h.
 */
export async function fetchGovCameras() {
  if (memoryCache) return memoryCache;

  const IDB_KEY = 'gov:all';
  const cached = await idbGet(IDB_STORE, IDB_KEY);
  if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) {
    memoryCache = cached.data;
    console.log('[gov] IDB cache hit:', cached.data.length, 'cameras');
    return memoryCache;
  }

  console.log('[gov] Fetching from API...');
  try {
    const providers = 'digitraffic,tfl,lta,usgs,jma,dgt';
    const res = await fetch(`${API_URL}/api/webcams?bbox=-90,-180,90,180&providers=${encodeURIComponent(providers)}`);
    if (!res.ok) {
      console.warn('[gov] API error:', res.status);
      return memoryCache ?? [];
    }
    const rows = await res.json();
    const parsed = rows.map(parseWebcam);
    memoryCache = parsed;
    idbSet(IDB_STORE, IDB_KEY, { ts: Date.now(), data: parsed });
    console.log('[gov] Fetched', parsed.length, 'cameras total');
    return parsed;
  } catch (e) {
    console.error('[gov] error:', e);
    return memoryCache ?? [];
  }
}
