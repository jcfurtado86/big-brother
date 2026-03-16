/**
 * Group a flat array of records by a key field (e.g. icao24, mmsi).
 * Returns Map<id, points[]> with points sorted by time ascending.
 */
export function groupByEntity(records, idField, timeField = 'recorded_at') {
  const map = new Map();
  for (const r of records) {
    const id = r[idField];
    if (!map.has(id)) map.set(id, []);
    r._t = new Date(r[timeField]).getTime();
    map.get(id).push(r);
  }
  return map;
}

/**
 * Binary search: find index of last point with _t <= targetTime.
 */
function bisect(points, t) {
  let lo = 0, hi = points.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid]._t <= t) lo = mid + 1;
    else hi = mid - 1;
  }
  return hi; // -1 if t < first point
}

/**
 * Interpolate angular values (heading) using shortest arc.
 */
function lerpAngle(a, b, t) {
  if (a == null || b == null) return b ?? a;
  let diff = ((b - a + 540) % 360) - 180;
  return ((a + diff * t) + 360) % 360;
}

function lerp(a, b, t) {
  if (a == null || b == null) return b ?? a;
  return a + (b - a) * t;
}

/**
 * Interpolate position and attributes at a given time.
 * Returns null if the entity doesn't exist at this time.
 */
export function interpolateAt(points, targetTime) {
  if (!points || points.length === 0) return null;

  const i = bisect(points, targetTime);

  // Before first point
  if (i < 0) return null;

  // After last point
  if (i >= points.length - 1) {
    // Only show if within 10 minutes of last known point
    if (targetTime - points[points.length - 1]._t > 10 * 60_000) return null;
    return points[points.length - 1];
  }

  const p0 = points[i];
  const p1 = points[i + 1];
  const dt = p1._t - p0._t;
  if (dt === 0) return p0;

  const frac = (targetTime - p0._t) / dt;

  return {
    ...p0,
    lat: lerp(p0.lat, p1.lat, frac),
    lon: lerp(p0.lon, p1.lon, frac),
    altitude: lerp(p0.altitude, p1.altitude, frac),
    heading: lerpAngle(p0.heading, p1.heading, frac),
    velocity: lerp(p0.velocity, p1.velocity, frac),
    vertical_rate: lerp(p0.vertical_rate, p1.vertical_rate, frac),
    cog: lerpAngle(p0.cog, p1.cog, frac),
    sog: lerp(p0.sog, p1.sog, frac),
    _t: targetTime,
  };
}

/**
 * Get trail positions from start up to targetTime.
 */
export function getTrailUpTo(points, targetTime) {
  if (!points || points.length === 0) return [];

  const i = bisect(points, targetTime);
  if (i < 0) return [];

  const trail = points.slice(0, i + 1);

  // Add interpolated tip if between two points (reuse bisect result)
  if (i < points.length - 1) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dt = p1._t - p0._t;
    if (dt > 0) {
      const frac = (targetTime - p0._t) / dt;
      trail.push({
        ...p0,
        lat: lerp(p0.lat, p1.lat, frac),
        lon: lerp(p0.lon, p1.lon, frac),
        altitude: lerp(p0.altitude, p1.altitude, frac),
        heading: lerpAngle(p0.heading, p1.heading, frac),
        velocity: lerp(p0.velocity, p1.velocity, frac),
        vertical_rate: lerp(p0.vertical_rate, p1.vertical_rate, frac),
        cog: lerpAngle(p0.cog, p1.cog, frac),
        sog: lerp(p0.sog, p1.sog, frac),
        _t: targetTime,
      });
    }
  }

  return trail;
}
