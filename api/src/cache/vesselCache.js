const STALE_MS = 10 * 60_000; // evict vessels not seen for 10 min

const vessels = new Map(); // mmsi → vessel data

export function upsertVessel(vessel) {
  const existing = vessels.get(vessel.mmsi);
  if (existing) {
    // Merge: position updates (PositionReport) and static data (ShipStaticData)
    // may arrive separately
    vessels.set(vessel.mmsi, { ...existing, ...vessel, _seenAt: Date.now() });
  } else {
    vessels.set(vessel.mmsi, { ...vessel, _seenAt: Date.now() });
  }
}

export function getVessels(bbox) {
  evictStale();
  if (!bbox) return [...vessels.values()];

  const out = [];
  for (const v of vessels.values()) {
    if (v.lat == null || v.lon == null) continue;
    if (v.lat < bbox.south || v.lat > bbox.north) continue;
    if (v.lon < bbox.west || v.lon > bbox.east) continue;
    out.push(v);
  }
  return out;
}

export function getVesselCount() {
  return vessels.size;
}

function evictStale() {
  const cutoff = Date.now() - STALE_MS;
  for (const [k, v] of vessels) {
    if (v._seenAt < cutoff) vessels.delete(k);
  }
}
