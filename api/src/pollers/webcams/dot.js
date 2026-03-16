import db from '../../db.js';
import config from '../../config.js';
import { updateMeta } from '../../utils/scheduler.js';

const BATCH = 200;

// ── Caltrans (California DOT, 12 districts) ───────────────────────────────
async function fetchCaltrans() {
  const cams = [];
  const districts = [1,2,3,4,5,6,7,8,9,10,11,12];

  for (const d of districts) {
    const pad = String(d).padStart(2, '0');
    const url = `https://cwwp2.dot.ca.gov/data/d${d}/cctv/cctvStatusD${pad}.json`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) continue;
      const data = await res.json();
      const list = data?.data || data;
      if (!Array.isArray(list)) continue;

      for (const c of list) {
        const loc = c.location || {};
        const lat = parseFloat(loc.latitude);
        const lon = parseFloat(loc.longitude);
        if (!lat || !lon) continue;

        const imgData = c.imageData || {};
        const imageUrl = imgData.static?.currentImageURL || null;
        const streamUrl = imgData.streamingVideoURL || null;

        cams.push({
          id: `caltrans_d${d}_${lat}_${lon}`,
          lat, lon,
          geom: db.raw('ST_SetSRID(ST_MakePoint(?, ?), 4326)', [lon, lat]),
          category: streamUrl ? 'live' : 'timelapse',
          title: (loc.locationName || `Caltrans D${d}`).substring(0, 300),
          city: (loc.nearbyPlace || '').substring(0, 100),
          region: 'California',
          country: 'United States',
          country_code: 'US',
          provider: 'caltrans',
          status: c.inService === 'true' ? 'active' : 'inactive',
          player_url: null,
          image_url: imageUrl?.substring(0, 500) || null,
          stream_url: streamUrl?.substring(0, 500) || null,
          thumbnail_url: null,
          direction: (c.location?.direction || '').substring(0, 20),
          route: (c.location?.route || '').substring(0, 100),
          updated_at: new Date(),
        });
      }
    } catch (e) {
      console.warn(`[webcams:dot] Caltrans D${d} error:`, e.message);
    }
  }
  return cams;
}

// ── 511 Multi-state ────────────────────────────────────────────────────────
const IBI_STATES = [
  { code: 'NY', domain: '511ny.org', key: 'DOT_511NY_KEY' },
  { code: 'GA', domain: '511ga.org', key: 'DOT_511GA_KEY' },
  { code: 'WI', domain: '511wi.gov', key: 'DOT_511WI_KEY' },
  { code: 'AK', domain: '511.alaska.gov', key: 'DOT_511AK_KEY' },
  { code: 'AZ', domain: 'az511.gov', key: 'DOT_511AZ_KEY' },
  { code: 'LA', domain: '511la.org', key: 'DOT_511LA_KEY' },
  { code: 'UT', domain: 'udottraffic.utah.gov', key: 'DOT_511UT_KEY' },
  { code: 'ID', domain: '511.idaho.gov', key: 'DOT_511ID_KEY' },
  { code: 'CT', domain: 'www.511ct.org', key: 'DOT_511CT_KEY' },
  { code: 'NV', domain: 'nvroads.com', key: 'DOT_511NV_KEY' },
];

async function fetch511Cameras() {
  const cams = [];

  for (const { code, domain, key: envKey } of IBI_STATES) {
    const apiKey = config[envKey];
    if (!apiKey) continue;

    try {
      const url = `https://${domain}/api/getcameras?key=${apiKey}&format=json`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data)) continue;

      for (const c of data) {
        const lat = parseFloat(c.Latitude || c.latitude);
        const lon = parseFloat(c.Longitude || c.longitude);
        if (!lat || !lon) continue;

        cams.push({
          id: `511${code}_${c.ID || c.Id || `${lat}_${lon}`}`,
          lat, lon,
          geom: db.raw('ST_SetSRID(ST_MakePoint(?, ?), 4326)', [lon, lat]),
          category: c.VideoUrl ? 'live' : 'timelapse',
          title: (c.Name || c.Description || `511 ${code}`).substring(0, 300),
          city: '',
          region: code,
          country: 'United States',
          country_code: 'US',
          provider: `511_${code}`,
          status: c.Disabled ? 'inactive' : 'active',
          player_url: null,
          image_url: (c.Url || c.ImageUrl || '').substring(0, 500) || null,
          stream_url: (c.VideoUrl || '').substring(0, 500) || null,
          thumbnail_url: null,
          direction: null,
          route: null,
          updated_at: new Date(),
        });
      }
    } catch (e) {
      console.warn(`[webcams:dot] 511${code} error:`, e.message);
    }
  }
  return cams;
}

// ── OHGO (Ohio) ────────────────────────────────────────────────────────────
async function fetchOhgo() {
  const apiKey = config.DOT_OHGO_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch('https://publicapi.ohgo.com/api/v1/cameras', {
      headers: { Authorization: `APIKEY ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list = data.results || [];

    return list.map(c => ({
      id: `ohgo_${c.id || `${c.latitude}_${c.longitude}`}`,
      lat: c.latitude,
      lon: c.longitude,
      geom: db.raw('ST_SetSRID(ST_MakePoint(?, ?), 4326)', [c.longitude, c.latitude]),
      category: 'timelapse',
      title: (c.description || 'OHGO').substring(0, 300),
      city: '',
      region: 'Ohio',
      country: 'United States',
      country_code: 'US',
      provider: 'ohgo',
      status: 'active',
      player_url: null,
      image_url: (c.largeImageUrl || c.smallImageUrl || '').substring(0, 500) || null,
      stream_url: null,
      thumbnail_url: (c.smallImageUrl || '').substring(0, 500) || null,
      direction: (c.direction || '').substring(0, 20),
      route: (c.routeName || '').substring(0, 100),
      updated_at: new Date(),
    })).filter(c => c.lat && c.lon);
  } catch (e) {
    console.warn('[webcams:dot] OHGO error:', e.message);
    return [];
  }
}

// ── WSDOT (Washington State) ───────────────────────────────────────────────
async function fetchWsdot() {
  const apiKey = config.DOT_WSDOT_KEY;
  if (!apiKey) return [];

  try {
    const url = `https://wsdot.wa.gov/Traffic/api/HighwayCameras/HighwayCamerasREST.svc/GetCamerasAsJson?AccessCode=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map(c => ({
      id: `wsdot_${c.CameraID || `${c.DisplayLatitude}_${c.DisplayLongitude}`}`,
      lat: c.DisplayLatitude,
      lon: c.DisplayLongitude,
      geom: db.raw('ST_SetSRID(ST_MakePoint(?, ?), 4326)', [c.DisplayLongitude, c.DisplayLatitude]),
      category: 'timelapse',
      title: (c.Title || 'WSDOT').substring(0, 300),
      city: '',
      region: 'Washington',
      country: 'United States',
      country_code: 'US',
      provider: 'wsdot',
      status: c.IsActive ? 'active' : 'inactive',
      player_url: null,
      image_url: (c.ImageURL || '').substring(0, 500) || null,
      stream_url: null,
      thumbnail_url: null,
      direction: null,
      route: null,
      updated_at: new Date(),
    })).filter(c => c.lat && c.lon);
  } catch (e) {
    console.warn('[webcams:dot] WSDOT error:', e.message);
    return [];
  }
}

export async function fetchDotWebcams() {
  console.log('[webcams:dot] Fetching DOT cameras...');

  const [caltrans, ibi511, ohgo, wsdot] = await Promise.all([
    fetchCaltrans(),
    fetch511Cameras(),
    fetchOhgo(),
    fetchWsdot(),
  ]);

  const all = [...caltrans, ...ibi511, ...ohgo, ...wsdot];
  let count = 0;

  for (let i = 0; i < all.length; i += BATCH) {
    const batch = all.slice(i, i + BATCH);
    await db('webcams').insert(batch).onConflict('id').merge();
    count += batch.length;
  }

  await updateMeta('webcams_dot', count);
  console.log(`[webcams:dot] Done: ${count} cameras (caltrans=${caltrans.length}, 511=${ibi511.length}, ohgo=${ohgo.length}, wsdot=${wsdot.length})`);
}
