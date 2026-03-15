import { idbGet, idbSet } from '../utils/idbCache';

const IDB_STORE = 'webcams';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h (images update frequently)

let memoryCache = null;

// ─── Finland — Digitraffic (no key, JSON) ─────────────────────────

async function fetchDigitraffic() {
  try {
    const res = await fetch('https://tie.digitraffic.fi/api/weathercam/v1/stations', {
      headers: { 'Digitraffic-User': 'BigBrother/1.0', 'Accept-Encoding': 'gzip' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const results = [];
    for (const f of data.features ?? []) {
      const [lon, lat] = f.geometry?.coordinates ?? [];
      if (lat == null || lon == null) continue;
      const props = f.properties ?? {};
      const presets = props.presets ?? [];
      // Create one camera per preset (each is a different angle)
      for (const preset of presets) {
        if (!preset.inCollection) continue;
        const id = `webcam_digi_${preset.id}`;
        results.push({
          id, webcamId: id, lat, lon,
          category: 'timelapse',
          title: props.name || f.id,
          city: '', region: '', country: 'Finland', countryCode: 'FI',
          provider: 'Digitraffic',
          status: 'active',
          playerUrl: null, playerFallbackUrl: null,
          imageUrl: `https://weathercam.digitraffic.fi/${preset.id}.jpg`,
          streamUrl: null, thumbnailUrl: null,
          direction: null,
        });
      }
    }
    console.log('[gov/digitraffic]', results.length, 'cameras');
    return results;
  } catch (e) {
    console.warn('[gov/digitraffic] error:', e.message);
    return [];
  }
}

// ─── UK — Transport for London JamCam (no key, JSON) ──────────────

async function fetchTfl() {
  try {
    const res = await fetch('https://api.tfl.gov.uk/Place/Type/JamCam');
    if (!res.ok) return [];
    const data = await res.json();
    const results = [];
    for (const cam of data) {
      if (cam.lat == null || cam.lon == null) continue;
      const props = cam.additionalProperties ?? [];
      const imageUrl = props.find(p => p.key === 'imageUrl')?.value ?? null;
      const videoUrl = props.find(p => p.key === 'videoUrl')?.value ?? null;
      const id = `webcam_tfl_${cam.id}`;
      results.push({
        id, webcamId: id, lat: cam.lat, lon: cam.lon,
        category: videoUrl ? 'live' : 'timelapse',
        title: cam.commonName || '',
        city: 'London', region: 'England', country: 'United Kingdom', countryCode: 'GB',
        provider: 'TfL JamCam',
        status: 'active',
        playerUrl: null, playerFallbackUrl: null,
        imageUrl,
        streamUrl: videoUrl, thumbnailUrl: null,
        direction: null,
      });
    }
    console.log('[gov/tfl]', results.length, 'cameras');
    return results;
  } catch (e) {
    console.warn('[gov/tfl] error:', e.message);
    return [];
  }
}

// ─── Singapore — LTA (no key, JSON) ──────────────────────────────

async function fetchSingapore() {
  try {
    const res = await fetch('https://api.data.gov.sg/v1/transport/traffic-images');
    if (!res.ok) return [];
    const data = await res.json();
    const cameras = data.items?.[0]?.cameras ?? [];
    const results = [];
    for (const cam of cameras) {
      const lat = cam.location?.latitude;
      const lon = cam.location?.longitude;
      if (lat == null || lon == null) continue;
      const id = `webcam_sg_${cam.camera_id}`;
      results.push({
        id, webcamId: id, lat, lon,
        category: 'timelapse',
        title: `Camera ${cam.camera_id}`,
        city: 'Singapore', region: '', country: 'Singapore', countryCode: 'SG',
        provider: 'LTA Singapore',
        status: 'active',
        playerUrl: null, playerFallbackUrl: null,
        imageUrl: cam.image,
        streamUrl: null, thumbnailUrl: null,
        direction: null,
      });
    }
    console.log('[gov/singapore]', results.length, 'cameras');
    return results;
  } catch (e) {
    console.warn('[gov/singapore] error:', e.message);
    return [];
  }
}

// ─── USGS Volcano Webcams (no key, JSON) ─────────────────────────

async function fetchUsgs() {
  try {
    const res = await fetch('https://volcview.wr.usgs.gov/ashcam-api/webcamApi/webcams');
    if (!res.ok) return [];
    const data = await res.json();
    const webcams = data.webcams ?? data;
    const results = [];
    for (const cam of webcams) {
      if (cam.latitude == null || cam.longitude == null) continue;
      if (cam.hasImages !== 'Y') continue;
      const id = `webcam_usgs_${cam.webcamCode}`;
      results.push({
        id, webcamId: id,
        lat: cam.latitude, lon: cam.longitude,
        category: 'timelapse',
        title: cam.webcamName || cam.webcamCode,
        city: '', region: cam.vName || '', country: 'United States', countryCode: 'US',
        provider: 'USGS Volcano',
        status: 'active',
        playerUrl: null, playerFallbackUrl: null,
        imageUrl: cam.currentImageUrl ?? null,
        streamUrl: null,
        thumbnailUrl: cam.currentThumbImageUrl ?? null,
        direction: cam.bearingDeg ? `${cam.bearingDeg}°` : null,
      });
    }
    console.log('[gov/usgs]', results.length, 'cameras');
    return results;
  } catch (e) {
    console.warn('[gov/usgs] error:', e.message);
    return [];
  }
}

// ─── Spain — DGT (no key, XML) ──────────────────────────────────

async function fetchDgt() {
  try {
    const res = await fetch('https://nap.dgt.es/datex2/v3/dgt/DevicePublication/camaras_datex2_v36.xml');
    if (!res.ok) return [];
    const text = await res.text();
    const results = [];

    // Parse XML with regex (lightweight, no DOMParser dependency issues)
    const deviceRegex = /<ns2:device[^>]*id="(\d+)"[^>]*>[\s\S]*?<\/ns2:device>/g;
    let match;
    while ((match = deviceRegex.exec(text)) !== null) {
      const block = match[0];
      const camId = match[1];

      const latMatch = block.match(/<loc:latitude>([-\d.]+)<\/loc:latitude>/);
      const lonMatch = block.match(/<loc:longitude>([-\d.]+)<\/loc:longitude>/);
      if (!latMatch || !lonMatch) continue;

      const lat = parseFloat(latMatch[1]);
      const lon = parseFloat(lonMatch[1]);
      if (isNaN(lat) || isNaN(lon)) continue;

      const roadMatch = block.match(/<loc:roadName>([^<]+)<\/loc:roadName>/);
      const destMatch = block.match(/<loc:roadDestination>([^<]+)<\/loc:roadDestination>/);
      const provMatch = block.match(/<lse:province>([^<]+)<\/lse:province>/);
      const urlMatch = block.match(/<fse:deviceUrl>([^<]+)<\/fse:deviceUrl>/);

      const road = roadMatch?.[1] ?? '';
      const dest = destMatch?.[1] ?? '';
      const province = provMatch?.[1] ?? '';

      const id = `webcam_dgt_${camId}`;
      results.push({
        id, webcamId: id, lat, lon,
        category: 'timelapse',
        title: `${road} ${dest}`.trim() || `Camera ${camId}`,
        city: province, region: province, country: 'Spain', countryCode: 'ES',
        provider: 'DGT España',
        status: 'active',
        playerUrl: null, playerFallbackUrl: null,
        imageUrl: urlMatch?.[1] ?? `https://infocar.dgt.es/etraffic/data/camaras/${camId}.jpg`,
        streamUrl: null, thumbnailUrl: null,
        direction: null,
        route: road || null,
      });
    }
    console.log('[gov/dgt]', results.length, 'cameras');
    return results;
  } catch (e) {
    console.warn('[gov/dgt] error:', e.message);
    return [];
  }
}

// ─── Japan — JMA Volcano Webcams (no key, GeoJSON) ───────────────

async function fetchJma() {
  try {
    const res = await fetch('https://www.data.jma.go.jp/svd/vois/data/tokyo/volcam/param/geojson/camicon.geojson');
    if (!res.ok) return [];
    const data = await res.json();
    const results = [];
    for (const f of data.features ?? []) {
      const [lon, lat] = f.geometry?.coordinates ?? [];
      if (lat == null || lon == null) continue;
      const props = f.properties ?? {};
      const code = props.code;
      const id = `webcam_jma_${code}`;
      results.push({
        id, webcamId: id, lat, lon,
        category: 'timelapse',
        title: props.name || `Volcano ${code}`,
        city: '', region: '', country: 'Japan', countryCode: 'JP',
        provider: 'JMA Volcano',
        status: 'active',
        playerUrl: null, playerFallbackUrl: null,
        imageUrl: `https://www.data.jma.go.jp/svd/vois/data/tokyo/volcam/volcam.php?VC=${code}`,
        streamUrl: null, thumbnailUrl: null,
        direction: null,
      });
    }
    console.log('[gov/jma]', results.length, 'cameras');
    return results;
  } catch (e) {
    console.warn('[gov/jma] error:', e.message);
    return [];
  }
}

// ─── Combined Gov fetch ──────────────────────────────────────────

async function fetchAllGov() {
  const [digitraffic, tfl, singapore, usgs, dgt, jma] = await Promise.all([
    fetchDigitraffic().catch(() => []),
    fetchTfl().catch(() => []),
    fetchSingapore().catch(() => []),
    fetchUsgs().catch(() => []),
    fetchDgt().catch(() => []),
    fetchJma().catch(() => []),
  ]);
  return [...digitraffic, ...tfl, ...singapore, ...usgs, ...dgt, ...jma];
}

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

  console.log('[gov] Fetching from government sources...');
  try {
    const parsed = await fetchAllGov();
    memoryCache = parsed;
    idbSet(IDB_STORE, IDB_KEY, { ts: Date.now(), data: parsed });
    console.log('[gov] Fetched', parsed.length, 'cameras total');
    return parsed;
  } catch (e) {
    console.error('[gov] error:', e);
    return memoryCache ?? [];
  }
}
