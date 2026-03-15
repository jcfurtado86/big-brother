import { idbGet, idbSet } from '../utils/idbCache';

const IDB_STORE = 'webcams';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

let memoryCache = null;

// ─── Caltrans CWWP2 (no key needed) ───────────────────────────────

const CALTRANS_DISTRICTS = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1;
  const nn = String(n).padStart(2, '0');
  return `https://cwwp2.dot.ca.gov/data/d${n}/cctv/cctvStatusD${nn}.json`;
});

function parseCaltrans(data) {
  const results = [];
  const cams = data?.data ?? data;
  if (!Array.isArray(cams)) return results;

  for (const entry of cams) {
    const cam = entry?.cctv ?? entry;
    const loc = cam?.location ?? {};
    const lat = parseFloat(loc.latitude);
    const lon = parseFloat(loc.longitude);
    if (isNaN(lat) || isNaN(lon)) continue;

    const inService = cam.inService === 'true';
    const img = cam.imageData ?? {};
    const currentImage = img.static?.currentImageURL ?? null;
    const streamUrl = img.streamingVideoURL ?? null;

    const id = `webcam_caltrans_${lat}_${lon}_${results.length}`;
    results.push({
      id,
      webcamId: id,
      lat,
      lon,
      category: streamUrl ? 'live' : 'timelapse',
      title: loc.locationName || '',
      city: loc.nearbyPlace || '',
      region: 'California',
      country: 'United States',
      countryCode: 'US',
      provider: 'Caltrans',
      status: inService ? 'active' : 'inactive',
      playerUrl: null,
      playerFallbackUrl: null,
      imageUrl: currentImage,
      streamUrl,
      thumbnailUrl: null,
      direction: loc.direction ?? null,
      route: loc.route ?? null,
    });
  }
  return results;
}

async function fetchCaltrans() {
  const results = await Promise.all(
    CALTRANS_DISTRICTS.map(async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const json = await res.json();
        return parseCaltrans(json);
      } catch {
        return [];
      }
    })
  );
  return results.flat();
}

// ─── IBI 511 (same API format, per-state keys) ───────────────────

const IBI_511_STATES = [
  { code: 'NY', domain: '511ny.org',              key: import.meta.env.VITE_511NY_KEY },
  { code: 'GA', domain: '511ga.org',              key: import.meta.env.VITE_511GA_KEY },
  { code: 'WI', domain: '511wi.gov',              key: import.meta.env.VITE_511WI_KEY },
  { code: 'AK', domain: '511.alaska.gov',         key: import.meta.env.VITE_511AK_KEY },
  { code: 'AZ', domain: 'az511.com',              key: import.meta.env.VITE_511AZ_KEY },
  { code: 'LA', domain: '511la.org',              key: import.meta.env.VITE_511LA_KEY },
  { code: 'UT', domain: 'prod-ut.ibi511.com',     key: import.meta.env.VITE_511UT_KEY },
  { code: 'ID', domain: '511.idaho.gov',          key: import.meta.env.VITE_511ID_KEY },
  { code: 'CT', domain: 'prod-ct.ibi511.com',     key: import.meta.env.VITE_511CT_KEY },
  { code: 'NV', domain: 'nvroads.com',            key: import.meta.env.VITE_511NV_KEY },
];

const STATE_NAMES = {
  NY: 'New York', GA: 'Georgia', WI: 'Wisconsin', AK: 'Alaska',
  AZ: 'Arizona', LA: 'Louisiana', UT: 'Utah', ID: 'Idaho',
  CT: 'Connecticut', NV: 'Nevada',
};

function parse511(cameras, stateCode) {
  const results = [];
  if (!Array.isArray(cameras)) return results;

  for (const cam of cameras) {
    const lat = cam.Latitude ?? cam.latitude;
    const lon = cam.Longitude ?? cam.longitude;
    if (lat == null || lon == null) continue;

    const disabled = cam.Disabled ?? cam.disabled ?? false;
    const imageUrl = cam.Url ?? cam.url ?? null;
    const videoUrl = cam.VideoUrl ?? cam.videoUrl ?? null;

    const id = `webcam_511${stateCode}_${cam.ID ?? cam.Id ?? results.length}`;
    results.push({
      id,
      webcamId: id,
      lat,
      lon,
      category: videoUrl ? 'live' : 'timelapse',
      title: cam.Name ?? cam.name ?? '',
      city: '',
      region: STATE_NAMES[stateCode] ?? stateCode,
      country: 'United States',
      countryCode: 'US',
      provider: `511 ${stateCode}`,
      status: disabled ? 'inactive' : 'active',
      playerUrl: null,
      playerFallbackUrl: null,
      imageUrl,
      streamUrl: videoUrl,
      thumbnailUrl: null,
      direction: cam.DirectionOfTravel ?? cam.directionOfTravel ?? null,
      route: cam.RoadwayName ?? cam.roadwayName ?? null,
    });
  }
  return results;
}

async function fetch511() {
  const configured = IBI_511_STATES.filter(s => s.key);
  if (configured.length === 0) return [];

  const results = await Promise.all(
    configured.map(async ({ code, domain, key }) => {
      try {
        const url = `https://${domain}/api/getcameras?key=${encodeURIComponent(key)}&format=json`;
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`[dot/511${code}] API error:`, res.status);
          return [];
        }
        const json = await res.json();
        return parse511(json, code);
      } catch (e) {
        console.warn(`[dot/511${code}] error:`, e.message);
        return [];
      }
    })
  );
  return results.flat();
}

// ─── OHGO - Ohio (free key) ───────────────────────────────────────

const OHGO_KEY = import.meta.env.VITE_OHGO_KEY;

function parseOhgo(data) {
  const results = [];
  const items = data?.results ?? data;
  if (!Array.isArray(items)) return results;

  for (const cam of items) {
    const lat = cam.latitude;
    const lon = cam.longitude;
    if (lat == null || lon == null) continue;

    const id = `webcam_ohgo_${cam.id ?? results.length}`;
    const imageUrl = cam.smallImageUrl ?? cam.largeImageUrl ?? null;

    results.push({
      id,
      webcamId: id,
      lat,
      lon,
      category: 'timelapse',
      title: cam.description ?? cam.name ?? '',
      city: '',
      region: 'Ohio',
      country: 'United States',
      countryCode: 'US',
      provider: 'OHGO',
      status: 'active',
      playerUrl: null,
      playerFallbackUrl: null,
      imageUrl,
      streamUrl: null,
      thumbnailUrl: null,
      direction: cam.direction ?? null,
      route: cam.routeName ?? null,
    });
  }
  return results;
}

async function fetchOhgo() {
  if (!OHGO_KEY) return [];
  try {
    const res = await fetch('https://publicapi.ohgo.com/api/v1/cameras', {
      headers: { Authorization: `APIKEY ${OHGO_KEY}` },
    });
    if (!res.ok) {
      console.warn('[dot/ohgo] API error:', res.status);
      return [];
    }
    const json = await res.json();
    return parseOhgo(json);
  } catch (e) {
    console.warn('[dot/ohgo] error:', e.message);
    return [];
  }
}

// ─── WSDOT - Washington State (free key) ──────────────────────────

const WSDOT_KEY = import.meta.env.VITE_WSDOT_KEY;

function parseWsdot(data) {
  const results = [];
  if (!Array.isArray(data)) return results;

  for (const cam of data) {
    const lat = cam.DisplayLatitude;
    const lon = cam.DisplayLongitude;
    if (lat == null || lon == null) continue;

    const id = `webcam_wsdot_${cam.CameraID ?? results.length}`;
    results.push({
      id,
      webcamId: id,
      lat,
      lon,
      category: 'timelapse',
      title: cam.Title ?? cam.Description ?? '',
      city: '',
      region: 'Washington',
      country: 'United States',
      countryCode: 'US',
      provider: 'WSDOT',
      status: cam.IsActive ? 'active' : 'inactive',
      playerUrl: null,
      playerFallbackUrl: null,
      imageUrl: cam.ImageURL ?? null,
      streamUrl: null,
      thumbnailUrl: null,
      direction: null,
      route: null,
    });
  }
  return results;
}

async function fetchWsdot() {
  if (!WSDOT_KEY) return [];
  try {
    const url = `https://wsdot.wa.gov/Traffic/api/HighwayCameras/HighwayCamerasREST.svc/GetCamerasAsJson?AccessCode=${encodeURIComponent(WSDOT_KEY)}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('[dot/wsdot] API error:', res.status);
      return [];
    }
    const json = await res.json();
    return parseWsdot(json);
  } catch (e) {
    console.warn('[dot/wsdot] error:', e.message);
    return [];
  }
}

// ─── Combined DOT fetch ──────────────────────────────────────────

async function fetchAllDot() {
  const [caltrans, ibi, ohgo, wsdot] = await Promise.all([
    fetchCaltrans().catch(() => []),
    fetch511().catch(() => []),
    fetchOhgo().catch(() => []),
    fetchWsdot().catch(() => []),
  ]);
  return [...caltrans, ...ibi, ...ohgo, ...wsdot];
}

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

  console.log('[dot] Fetching from DOT sources...');
  try {
    const parsed = await fetchAllDot();
    memoryCache = parsed;
    idbSet(IDB_STORE, IDB_KEY, { ts: Date.now(), data: parsed });
    console.log('[dot] Fetched', parsed.length, 'cameras');
    return parsed;
  } catch (e) {
    console.error('[dot] error:', e);
    return memoryCache ?? [];
  }
}
