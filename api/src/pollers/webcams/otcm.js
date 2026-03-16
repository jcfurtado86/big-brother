import db from '../../db.js';
import { updateMeta } from '../../utils/scheduler.js';

const BATCH = 200;
const DATA_URL = 'https://raw.githubusercontent.com/AidanWelch/OpenTrafficCamMap/master/cameras/USA.json';

export async function fetchOtcmWebcams() {
  console.log('[webcams:otcm] Fetching OpenTrafficCam data...');

  try {
    const res = await fetch(DATA_URL, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) {
      console.warn('[webcams:otcm] fetch error:', res.status);
      return;
    }
    const data = await res.json();

    const cams = [];
    // Structure: { state: { city: [cameras] } }
    for (const [state, cities] of Object.entries(data)) {
      if (typeof cities !== 'object') continue;
      for (const [city, cameras] of Object.entries(cities)) {
        if (!Array.isArray(cameras)) continue;
        for (let i = 0; i < cameras.length; i++) {
          const c = cameras[i];
          const lat = parseFloat(c.latitude);
          const lon = parseFloat(c.longitude);
          if (!lat || !lon) continue;

          const isLive = c.format === 'M3U8';

          cams.push({
            id: `otcm_${state}_${lat}_${lon}_${i}`,
            lat, lon,
            geom: db.raw('ST_SetSRID(ST_MakePoint(?, ?), 4326)', [lon, lat]),
            category: isLive ? 'live' : 'timelapse',
            title: (c.description || `${city}, ${state}`).substring(0, 300),
            city: city.substring(0, 100),
            region: state.substring(0, 100),
            country: 'United States',
            country_code: 'US',
            provider: 'otcm',
            status: 'active',
            player_url: null,
            image_url: !isLive ? (c.url || '').substring(0, 500) || null : null,
            stream_url: isLive ? (c.url || '').substring(0, 500) || null : null,
            thumbnail_url: null,
            direction: (c.direction || '').substring(0, 20) || null,
            route: null,
            updated_at: new Date(),
          });
        }
      }
    }

    let count = 0;
    for (let i = 0; i < cams.length; i += BATCH) {
      const batch = cams.slice(i, i + BATCH);
      await db('webcams').insert(batch).onConflict('id').merge();
      count += batch.length;
    }

    await updateMeta('webcams_otcm', count);
    console.log(`[webcams:otcm] Done: ${count} cameras`);
  } catch (e) {
    console.error('[webcams:otcm] error:', e.message);
  }
}
