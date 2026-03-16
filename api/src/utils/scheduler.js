import db from '../db.js';

/**
 * Update data_source_meta after a poller run.
 */
export async function updateMeta(source, recordCount, status = 'ok') {
  await db('data_source_meta')
    .insert({
      source,
      last_update: new Date(),
      record_count: recordCount,
      status,
    })
    .onConflict('source')
    .merge();
}

/**
 * Get last update timestamp for a data source.
 */
export async function getLastUpdate(source) {
  const row = await db('data_source_meta').where({ source }).first();
  return row?.last_update ?? null;
}

/**
 * Check if a table is empty (for seed-on-first-run logic).
 */
export async function isTableEmpty(table) {
  const result = await db(table).count('* as cnt').first();
  return parseInt(result.cnt) === 0;
}

/**
 * Retry wrapper for poller fetch functions.
 * Retries up to `maxRetries` times with `delayMs` between attempts.
 * Logs each failure and returns the result on success, or undefined after all retries.
 */
export async function withRetry(fn, { label, maxRetries = 10, delayMs = 15_000 } = {}) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      console.warn(`[${label}] ${e.message} (attempt ${attempt}/${maxRetries})`);
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, delayMs));
    }
  }
  console.error(`[${label}] failed after ${maxRetries} attempts`);
}

/**
 * Safe setInterval that handles values > 2^31-1 ms (≈24.8 days)
 * by using recursive setTimeout.
 */
const MAX_TIMEOUT = 2_147_483_647; // 2^31 - 1

export function safeInterval(fn, ms) {
  if (ms <= MAX_TIMEOUT) {
    return setInterval(fn, ms);
  }
  function schedule() {
    setTimeout(() => { fn(); schedule(); }, ms > MAX_TIMEOUT ? MAX_TIMEOUT : ms);
  }
  schedule();
}
