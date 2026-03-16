const STALE_MS = 5 * 60_000; // evict flights not seen for 5 min

// Provider-keyed stores: 'opensky' | 'airplaneslive'
const stores = {
  opensky: { flights: new Map(), updatedAt: 0 },
  airplaneslive: { flights: new Map(), updatedAt: 0 },
};

export function upsertFlights(provider, entries) {
  const store = stores[provider];
  if (!store) return;
  const now = Date.now();
  for (const f of entries) {
    store.flights.set(f.icao24, { ...f, _seenAt: now });
  }
  store.updatedAt = now;
}

export function getFlights(provider, bbox) {
  const store = stores[provider];
  if (!store) return [];

  evictStale(store);

  const out = [];
  for (const f of store.flights.values()) {
    if (bbox) {
      if (f.lat < bbox.south || f.lat > bbox.north) continue;
      if (f.lon < bbox.west || f.lon > bbox.east) continue;
    }
    out.push(f);
  }
  return out;
}

export function getAllFlights(bbox) {
  // Merge both providers — airplaneslive takes priority for same icao24
  const merged = new Map();

  for (const f of stores.opensky.flights.values()) {
    merged.set(f.icao24, f);
  }
  for (const f of stores.airplaneslive.flights.values()) {
    const existing = merged.get(f.icao24);
    if (existing) {
      merged.set(f.icao24, {
        ...existing,
        ...f,
        category: f.category ?? existing.category,
        verticalRate: f.verticalRate ?? existing.verticalRate,
        squawk: f.squawk ?? existing.squawk,
      });
    } else {
      merged.set(f.icao24, f);
    }
  }

  evictStale(stores.opensky);
  evictStale(stores.airplaneslive);

  if (!bbox) return [...merged.values()];

  const out = [];
  for (const f of merged.values()) {
    if (f.lat < bbox.south || f.lat > bbox.north) continue;
    if (f.lon < bbox.west || f.lon > bbox.east) continue;
    out.push(f);
  }
  return out;
}

export function getStoreAge(provider) {
  return Date.now() - (stores[provider]?.updatedAt ?? 0);
}

function evictStale(store) {
  const cutoff = Date.now() - STALE_MS;
  for (const [k, v] of store.flights) {
    if (v._seenAt < cutoff) store.flights.delete(k);
  }
}
