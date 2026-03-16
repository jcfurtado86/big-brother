import db from '../../db.js';
import config from '../../config.js';
import { updateMeta } from '../../utils/scheduler.js';

const API_URL = 'https://api.windy.com/webcams/api/v3/webcams';
const LIMIT = 50;
const MAX_OFFSET = 1000;

// Grid: sweep globe in 5° cells, fetch nearby cameras for each
const GRID_STEP = 5;
const RADIUS_KM = 250;
const BATCH = 200;

function buildGrid() {
  const cells = [];
  for (let lat = -60; lat <= 70; lat += GRID_STEP) {
    for (let lon = -180; lon < 180; lon += GRID_STEP) {
      cells.push({ lat: lat + GRID_STEP / 2, lon: lon + GRID_STEP / 2 });
    }
  }
  return cells;
}

async function fetchCell(cell, apiKey) {
  const results = [];
  let offset = 0;

  while (offset < MAX_OFFSET) {
    try {
      const params = new URLSearchParams({
        nearby: `${cell.lat},${cell.lon},${RADIUS_KM}`,
        limit: String(LIMIT),
        offset: String(offset),
        include: 'location,images,player',
      });

      const res = await fetch(`${API_URL}?${params}`, {
        headers: { 'x-windy-api-key': apiKey },
        signal: AbortSignal.timeout(15_000),
      });

      if (res.status === 429) {
        console.warn('[webcams:windy] rate limited, pausing cell');
        break;
      }
      if (!res.ok) break;

      const data = await res.json();
      if (!data.webcams || data.webcams.length === 0) break;

      for (const wc of data.webcams) {
        const loc = wc.location || {};
        const imgs = wc.images || {};
        const live = wc.player?.live?.available;

        results.push({
          id: `windy_${wc.webcamId}`,
          lat: loc.latitude,
          lon: loc.longitude,
          geom: db.raw('ST_SetSRID(ST_MakePoint(?, ?), 4326)', [loc.longitude, loc.latitude]),
          category: live ? 'live' : 'timelapse',
          title: (wc.title || '').substring(0, 300),
          city: (loc.city || '').substring(0, 100),
          region: (loc.region || '').substring(0, 100),
          country: (loc.country || '').substring(0, 100),
          country_code: (loc.countryCode || '').substring(0, 5),
          provider: 'windy',
          status: wc.status || 'active',
          player_url: wc.webcamId ? `https://webcams.windy.com/webcams/public/embed/player/${wc.webcamId}/${live ? 'live' : 'day'}` : null,
          image_url: imgs.current?.preview || imgs.daylight?.preview || null,
          thumbnail_url: imgs.current?.thumbnail || imgs.daylight?.thumbnail || null,
          stream_url: null,
          direction: null,
          route: null,
          updated_at: new Date(),
        });
      }

      if (data.webcams.length < LIMIT) break;
      offset += LIMIT;
    } catch (e) {
      console.warn(`[webcams:windy] cell ${cell.lat},${cell.lon} error:`, e.message);
      break;
    }
  }

  return results;
}

export async function fetchWindyWebcams() {
  const apiKey = config.WINDY_WEBCAMS_KEY;
  if (!apiKey) {
    console.warn('[webcams:windy] No API key');
    return;
  }

  console.log('[webcams:windy] Starting grid crawl...');
  const grid = buildGrid();
  let totalCount = 0;
  const seen = new Set();

  for (let i = 0; i < grid.length; i++) {
    const cams = await fetchCell(grid[i], apiKey);

    // Deduplicate
    const unique = cams.filter(c => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    if (unique.length > 0) {
      // Batch upsert
      for (let j = 0; j < unique.length; j += BATCH) {
        const batch = unique.slice(j, j + BATCH);
        await db('webcams').insert(batch).onConflict('id').merge();
      }
      totalCount += unique.length;
    }

    // Rate limit: pause between cells
    if (i % 10 === 0 && i > 0) {
      console.log(`[webcams:windy] ${i}/${grid.length} cells, ${totalCount} cams`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  await updateMeta('webcams_windy', totalCount);
  console.log(`[webcams:windy] Done: ${totalCount} cameras`);
}
