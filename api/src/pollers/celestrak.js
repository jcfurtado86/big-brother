import db from '../db.js';
import { setTle } from '../cache/tleCache.js';
import { updateMeta, safeInterval } from '../utils/scheduler.js';
import config from '../config.js';

const TLE_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle';

async function fetchTle() {
  console.log('[tle] Fetching from CelesTrak...');
  try {
    const res = await fetch(TLE_URL);
    if (!res.ok) {
      console.warn('[tle] fetch error:', res.status);
      return;
    }
    const text = await res.text();
    const lines = text.trim().split('\n').filter(Boolean);
    const satCount = Math.floor(lines.length / 3);

    // Store in DB
    await db('tle_data')
      .insert({ id: 'active', tle_text: text, sat_count: satCount, fetched_at: new Date() })
      .onConflict('id')
      .merge();

    // Update in-memory cache
    setTle(text, satCount);
    await updateMeta('tle', satCount);
    console.log('[tle] Stored', satCount, 'satellites');
  } catch (e) {
    console.error('[tle] error:', e.message);
  }
}

async function loadFromDb() {
  const row = await db('tle_data').where({ id: 'active' }).first();
  if (row?.tle_text) {
    setTle(row.tle_text, row.sat_count);
    console.log('[tle] Loaded from DB:', row.sat_count, 'satellites');
    return row.fetched_at;
  }
  return null;
}

export function startTlePoller() {
  // Load from DB on startup, fetch if stale
  loadFromDb().then((fetchedAt) => {
    const age = fetchedAt ? Date.now() - new Date(fetchedAt).getTime() : Infinity;
    if (age > config.TLE_POLL_MS) {
      fetchTle();
    }
  });

  // Poll daily
  safeInterval(fetchTle, config.TLE_POLL_MS);
}
