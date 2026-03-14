const DB_NAME = 'bb_cache';
const DB_VERSION = 5;
const STORES = ['tle', 'flights', 'vessels'];

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

export async function idbDelete(store, key) {
  try {
    const db = await openDb();
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
  } catch { /* ignore */ }
}
