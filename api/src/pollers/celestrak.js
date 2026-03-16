import db from '../db.js';
import { setTle } from '../cache/tleCache.js';
import { updateMeta, safeInterval, withRetry } from '../utils/scheduler.js';
import config from '../config.js';

const TLE_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle';

async function fetchTle() {
  console.log('[tle] Fetching from CelesTrak...');

  const result = await withRetry(async () => {
    const res = await fetch(TLE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    const lines = text.trim().split('\n').filter(Boolean);
    const satCount = Math.floor(lines.length / 3);

    await db('tle_data')
      .insert({ id: 'active', tle_text: text, sat_count: satCount, fetched_at: new Date() })
      .onConflict('id')
      .merge();

    setTle(text, satCount);
    await updateMeta('tle', satCount);
    return satCount;
  }, { label: 'tle' });

  if (result != null) {
    console.log('[tle] Stored', result, 'satellites');
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
  loadFromDb().then((fetchedAt) => {
    const age = fetchedAt ? Date.now() - new Date(fetchedAt).getTime() : Infinity;
    if (age > config.TLE_POLL_MS) {
      fetchTle();
    }
  });

  safeInterval(fetchTle, config.TLE_POLL_MS);
}
