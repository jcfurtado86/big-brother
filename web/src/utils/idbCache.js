const DB_NAME = 'bb_cache';
const DB_VERSION = 15;
const STORES = ['tle', 'flights', 'vessels', 'telecom', 'receivers', 'atc', 'military', 'airspace', 'acled', 'webcams'];

// Clean up legacy databases from older versions
indexedDB.deleteDatabase('bb_satellite_cache');

let dbPromise = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        // Create required stores
        for (const name of STORES) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
        }
        // Remove legacy stores
        for (const name of db.objectStoreNames) {
          if (!STORES.includes(name)) db.deleteObjectStore(name);
        }
        // v15: clear webcams store — keys now prefixed by provider (windy:, otcm:)
        if (db.objectStoreNames.contains('webcams')) {
          req.transaction.objectStore('webcams').clear();
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => { dbPromise = null; reject(req.error); };
    });
  }
  return dbPromise;
}

export async function idbGet(store, key) {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx  = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror   = () => resolve(null);
    });
  } catch { return null; }
}

export async function idbSet(store, key, value) {
  try {
    const db = await openDb();
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value, key);
  } catch (e) {
    console.warn(`[idb] save to ${store}/${key} failed:`, e.message);
  }
}

export async function idbGetAllEntries(store) {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(store, 'readonly');
      const os = tx.objectStore(store);
      const keys = os.getAllKeys();
      const vals = os.getAll();
      tx.oncomplete = () => {
        const entries = [];
        for (let i = 0; i < keys.result.length; i++) {
          entries.push([keys.result[i], vals.result[i]]);
        }
        resolve(entries);
      };
      tx.onerror = () => resolve([]);
    });
  } catch { return []; }
}

export async function idbDelete(store, key) {
  try {
    const db = await openDb();
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
  } catch { /* ignore */ }
}

/**
 * Delete all entries in a store where `entry.ts` is older than `ttlMs`.
 * Runs in a single readwrite transaction. Returns count of deleted keys.
 */
export async function idbClearAll() {
  try {
    const db = await openDb();
    for (const name of STORES) {
      const tx = db.transaction(name, 'readwrite');
      tx.objectStore(name).clear();
    }
  } catch (e) {
    console.warn('[idb] clearAll failed:', e.message);
  }
}

export async function idbEstimateSize() {
  if (navigator.storage?.estimate) {
    const { usage, quota } = await navigator.storage.estimate();
    return { usage, quota };
  }
  return null;
}

export async function idbStoreCounts() {
  try {
    const db = await openDb();
    const counts = {};
    for (const name of STORES) {
      const tx = db.transaction(name, 'readonly');
      const count = tx.objectStore(name).count();
      await new Promise(r => { tx.oncomplete = r; });
      counts[name] = count.result;
    }
    return counts;
  } catch { return {}; }
}

export async function idbPurgeExpired(store, ttlMs) {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(store, 'readwrite');
      const os = tx.objectStore(store);
      const keys = os.getAllKeys();
      const vals = os.getAll();
      const now = Date.now();
      let deleted = 0;
      tx.oncomplete = () => resolve(deleted);
      tx.onerror    = () => resolve(0);
      keys.onsuccess = () => {
        vals.onsuccess = () => {
          for (let i = 0; i < keys.result.length; i++) {
            const entry = vals.result[i];
            if (entry?.ts && (now - entry.ts) >= ttlMs) {
              os.delete(keys.result[i]);
              deleted++;
            }
          }
        };
      };
    });
  } catch { return 0; }
}
