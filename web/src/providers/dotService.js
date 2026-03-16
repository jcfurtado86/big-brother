import { idbGet, idbSet } from '../utils/idbCache';
import { API_URL } from '../utils/api';
import { parseWebcam } from './webcamUtils';

const IDB_STORE = 'webcams';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

let memoryCache = null;

/**
 * Fetch all DOT traffic cameras. Cached in IDB for 24h.
 */
export async function fetchDotCameras() {
  if (memoryCache) return memoryCache;

  const IDB_KEY = 'dot:all';
  const cached = await idbGet(IDB_STORE, IDB_KEY);
  if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) {
    memoryCache = cached.data;
    console.log('[dot] IDB cache hit:', cached.data.length, 'cameras');
    return memoryCache;
  }

  console.log('[dot] Fetching from API...');
  try {
    const providers = 'caltrans,511 NY,511 GA,511 WI,511 AK,511 AZ,511 LA,511 UT,511 ID,511 CT,511 NV,OHGO,WSDOT';
    const res = await fetch(`${API_URL}/api/webcams?bbox=-90,-180,90,180&providers=${encodeURIComponent(providers)}`);
    if (!res.ok) {
      console.warn('[dot] API error:', res.status);
      return memoryCache ?? [];
    }
    const rows = await res.json();
    const parsed = rows.map(parseWebcam);
    memoryCache = parsed;
    idbSet(IDB_STORE, IDB_KEY, { ts: Date.now(), data: parsed });
    console.log('[dot] Fetched', parsed.length, 'cameras');
    return parsed;
  } catch (e) {
    console.error('[dot] error:', e);
    return memoryCache ?? [];
  }
}
