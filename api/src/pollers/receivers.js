import db from '../db.js';
import { updateMeta, isTableEmpty, getLastUpdate, safeInterval } from '../utils/scheduler.js';
import { fetchIpv4 } from '../utils/fetchIpv4.js';
import config from '../config.js';

const REGIONS_URL = 'https://map.adsb.lol/syncmap/mirror_regions.json';
const SYNC_URL = (region) => `https://map.adsb.lol/api/0/mlat-server/${region}/sync.json`;
const DEFAULT_REGIONS = ['0A', '0B', '0C', '0D', '1A', '2A', '2B', '2C'];
const TLS_OPTS = { rejectUnauthorized: false }; // adsb.lol uses self-signed cert

async function fetchRegions() {
  try {
    const res = await fetchIpv4(REGIONS_URL, TLS_OPTS);
    if (!res.ok) return DEFAULT_REGIONS;
    const data = await res.json();
    if (typeof data === 'object' && !Array.isArray(data)) {
      return Object.values(data)
        .filter(r => r.enabled !== false)
        .map(r => r.region);
    }
    return DEFAULT_REGIONS;
  } catch {
    return DEFAULT_REGIONS;
  }
}

async function fetchReceivers() {
  console.log('[receivers] Fetching ADS-B feeders from adsb.lol...');
  try {
    const regions = await fetchRegions();
    let count = 0;

    for (const region of regions) {
      let data;
      try {
        const res = await fetchIpv4(SYNC_URL(region), TLS_OPTS);
        if (!res.ok) continue;
        data = await res.json();
      } catch {
        continue;
      }

      const BATCH = 200;
      let batch = [];

      for (const [id, info] of Object.entries(data)) {
        if (!info || info.privacy) continue;
        const lat = info.lat ?? info.latitude;
        const lon = info.lon ?? info.longitude;
        if (lat == null || lon == null) continue;
        if (lat === 0 && lon === 0) continue;

        const peers = info.peers ? Object.keys(info.peers).length : 0;

        batch.push({
          id: `${region}_${id}`,
          lat,
          lon,
          geom: db.raw(`ST_SetSRID(ST_MakePoint(?, ?), 4326)`, [lon, lat]),
          user_name: (info.user || id).substring(0, 100),
          region,
          peers,
          updated_at: new Date(),
        });

        if (batch.length >= BATCH) {
          await db('adsb_receivers').insert(batch).onConflict('id').merge();
          count += batch.length;
          batch = [];
        }
      }

      if (batch.length > 0) {
        await db('adsb_receivers').insert(batch).onConflict('id').merge();
        count += batch.length;
      }
    }

    await updateMeta('receivers', count);
    console.log('[receivers] Upserted', count, 'ADS-B feeders');
  } catch (e) {
    console.error('[receivers] error:', e.message);
  }
}

export function startReceiversPoller() {
  isTableEmpty('adsb_receivers').then(empty => {
    if (empty) {
      fetchReceivers();
    } else {
      getLastUpdate('receivers').then(last => {
        const age = last ? Date.now() - new Date(last).getTime() : Infinity;
        if (age > config.RECEIVERS_POLL_MS) fetchReceivers();
      });
    }
  });

  safeInterval(fetchReceivers, config.RECEIVERS_POLL_MS);
}
