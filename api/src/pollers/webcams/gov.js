import db from '../../db.js';
import { updateMeta } from '../../utils/scheduler.js';

const BATCH = 200;

// ── Finland - Digitraffic ──────────────────────────────────────────────────
async function fetchFinland() {
  try {
    const res = await fetch('https://tie.digitraffic.fi/api/weathercam/v1/stations', {
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const features = data.features || [];

    const cams = [];
    for (const f of features) {
      const coords = f.geometry?.coordinates;
      if (!coords) continue;
      const [lon, lat] = coords;
      const props = f.properties || {};
      const presets = props.presets || [];
      if (presets.length === 0) continue;

      const preset = presets[0];
      cams.push({
        id: `fin_${props.id || preset.id}`,
        lat, lon,
        geom: db.raw('ST_SetSRID(ST_MakePoint(?, ?), 4326)', [lon, lat]),
        category: 'timelapse',
        title: (props.name || `Finland ${props.id}`).substring(0, 300),
        city: '',
        region: '',
        country: 'Finland',
        country_code: 'FI',
        provider: 'digitraffic',
        status: 'active',
        player_url: null,
        image_url: preset.id ? `https://weathercam.digitraffic.fi/${preset.id}.jpg` : null,
        stream_url: null,
        thumbnail_url: null,
        direction: null,
        route: null,
        updated_at: new Date(),
      });
    }
    return cams;
  } catch (e) {
    console.warn('[webcams:gov] Finland error:', e.message);
    return [];
  }
}

// ── UK - Transport for London JamCam ───────────────────────────────────────
async function fetchTfL() {
  try {
    const res = await fetch('https://api.tfl.gov.uk/Place/Type/JamCam', {
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map(c => {
      const props = (c.additionalProperties || []).reduce((acc, p) => {
        acc[p.key] = p.value;
        return acc;
      }, {});

      return {
        id: `tfl_${c.id}`,
        lat: c.lat,
        lon: c.lon,
        geom: db.raw('ST_SetSRID(ST_MakePoint(?, ?), 4326)', [c.lon, c.lat]),
        category: props.videoUrl ? 'live' : 'timelapse',
        title: (c.commonName || 'JamCam').substring(0, 300),
        city: 'London',
        region: 'England',
        country: 'United Kingdom',
        country_code: 'GB',
        provider: 'tfl',
        status: 'active',
        player_url: null,
        image_url: (props.imageUrl || '').substring(0, 500) || null,
        stream_url: (props.videoUrl || '').substring(0, 500) || null,
        thumbnail_url: null,
        direction: null,
        route: null,
        updated_at: new Date(),
      };
    }).filter(c => c.lat && c.lon);
  } catch (e) {
    console.warn('[webcams:gov] TfL error:', e.message);
    return [];
  }
}

// ── Singapore - LTA ────────────────────────────────────────────────────────
async function fetchSingapore() {
  try {
    const res = await fetch('https://api.data.gov.sg/v1/transport/traffic-images', {
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items = data.items?.[0]?.cameras || [];

    return items.map(c => ({
      id: `sg_${c.camera_id}`,
      lat: c.location?.latitude,
      lon: c.location?.longitude,
      geom: db.raw('ST_SetSRID(ST_MakePoint(?, ?), 4326)', [c.location?.longitude, c.location?.latitude]),
      category: 'timelapse',
      title: `Singapore Cam ${c.camera_id}`,
      city: 'Singapore',
      region: '',
      country: 'Singapore',
      country_code: 'SG',
      provider: 'lta',
      status: 'active',
      player_url: null,
      image_url: (c.image || '').substring(0, 500) || null,
      stream_url: null,
      thumbnail_url: null,
      direction: null,
      route: null,
      updated_at: new Date(),
    })).filter(c => c.lat && c.lon);
  } catch (e) {
    console.warn('[webcams:gov] Singapore error:', e.message);
    return [];
  }
}

// ── USGS Volcano Webcams ───────────────────────────────────────────────────
async function fetchUSGS() {
  try {
    const res = await fetch('https://volcview.wr.usgs.gov/ashcam-api/webcamApi/webcams', {
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .filter(c => c.hasImages === 'Y' && c.latitude && c.longitude)
      .map(c => ({
        id: `usgs_${c.webcamCode}`,
        lat: c.latitude,
        lon: c.longitude,
        geom: db.raw('ST_SetSRID(ST_MakePoint(?, ?), 4326)', [c.longitude, c.latitude]),
        category: 'timelapse',
        title: (c.webcamName || `USGS ${c.webcamCode}`).substring(0, 300),
        city: '',
        region: '',
        country: 'United States',
        country_code: 'US',
        provider: 'usgs',
        status: 'active',
        player_url: null,
        image_url: (c.currentImageUrl || '').substring(0, 500) || null,
        stream_url: null,
        thumbnail_url: (c.currentThumbImageUrl || '').substring(0, 500) || null,
        direction: c.bearingDeg ? String(c.bearingDeg) : null,
        route: null,
        updated_at: new Date(),
      }));
  } catch (e) {
    console.warn('[webcams:gov] USGS error:', e.message);
    return [];
  }
}

// ── Japan - JMA Volcano ────────────────────────────────────────────────────
async function fetchJMA() {
  try {
    const res = await fetch('https://www.data.jma.go.jp/svd/vois/data/tokyo/volcam/param/geojson/camicon.geojson', {
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const features = data.features || [];

    return features.map(f => {
      const [lon, lat] = f.geometry?.coordinates || [];
      const props = f.properties || {};
      if (!lat || !lon) return null;

      return {
        id: `jma_${props.VC || `${lat}_${lon}`}`,
        lat, lon,
        geom: db.raw('ST_SetSRID(ST_MakePoint(?, ?), 4326)', [lon, lat]),
        category: 'timelapse',
        title: (props.name || `JMA ${props.VC}`).substring(0, 300),
        city: '',
        region: '',
        country: 'Japan',
        country_code: 'JP',
        provider: 'jma',
        status: 'active',
        player_url: props.VC ? `https://www.data.jma.go.jp/svd/vois/data/tokyo/volcam/volcam.php?VC=${props.VC}` : null,
        image_url: null,
        stream_url: null,
        thumbnail_url: null,
        direction: null,
        route: null,
        updated_at: new Date(),
      };
    }).filter(Boolean);
  } catch (e) {
    console.warn('[webcams:gov] JMA error:', e.message);
    return [];
  }
}

export async function fetchGovWebcams() {
  console.log('[webcams:gov] Fetching government cameras...');

  const [finland, tfl, sg, usgs, jma] = await Promise.all([
    fetchFinland(),
    fetchTfL(),
    fetchSingapore(),
    fetchUSGS(),
    fetchJMA(),
  ]);

  const all = [...finland, ...tfl, ...sg, ...usgs, ...jma];
  let count = 0;

  for (let i = 0; i < all.length; i += BATCH) {
    const batch = all.slice(i, i + BATCH);
    await db('webcams').insert(batch).onConflict('id').merge();
    count += batch.length;
  }

  await updateMeta('webcams_gov', count);
  console.log(`[webcams:gov] Done: ${count} cameras (fin=${finland.length}, tfl=${tfl.length}, sg=${sg.length}, usgs=${usgs.length}, jma=${jma.length})`);
}
