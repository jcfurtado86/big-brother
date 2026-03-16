import db from '../db.js';
import { getAllFlights } from '../cache/flightCache.js';

const SNAPSHOT_INTERVAL_MS = 5 * 60_000; // 5 min
const RETENTION_DAYS = 30;
const BATCH = 500;

async function takeSnapshot() {
  const flights = getAllFlights(null);
  if (flights.length === 0) return;

  const now = new Date();
  let inserted = 0;

  try {
    for (let i = 0; i < flights.length; i += BATCH) {
      const batch = flights.slice(i, i + BATCH).map(f => ({
        icao24: f.icao24,
        callsign: f.callsign || null,
        lat: f.lat,
        lon: f.lon,
        altitude: f.altitude,
        heading: f.heading,
        velocity: f.velocity,
        vertical_rate: f.verticalRate,
        on_ground: f.onGround || false,
        squawk: f.squawk || null,
        category: f.category || 0,
        provider: f.military != null ? 'airplaneslive' : 'opensky',
        recorded_at: now,
      }));

      await db('flight_history').insert(batch);
      inserted += batch.length;
    }

    console.log(`[flight-history] Snapshot: ${inserted} positions recorded`);
  } catch (e) {
    console.error('[flight-history] snapshot error:', e.message);
  }
}

async function cleanup() {
  try {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const result = await db('flight_history')
      .where('recorded_at', '<', cutoff)
      .del();

    if (result > 0) {
      console.log(`[flight-history] Cleanup: removed ${result} old records`);
    }
  } catch (e) {
    console.error('[flight-history] cleanup error:', e.message);
  }
}

export function startFlightHistoryPoller() {
  // First snapshot after 2 min (let pollers populate cache first)
  setTimeout(() => {
    takeSnapshot();
    setInterval(takeSnapshot, SNAPSHOT_INTERVAL_MS);
  }, 2 * 60_000);

  // Daily cleanup at startup + every 24h
  cleanup();
  setInterval(cleanup, 24 * 60 * 60 * 1000);
}
