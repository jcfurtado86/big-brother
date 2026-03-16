import { Cartesian2, Cartographic, Ellipsoid, Math as CesiumMath } from 'cesium';

/**
 * Computes the visible bounding box from the current camera.
 *
 * Samples a grid of screen-space points (not just the 4 corners) so that
 * tilted / inclined views are handled correctly — top-of-screen rays that
 * miss the ellipsoid are simply ignored while the horizon line is still
 * captured via intermediate samples along the edges.
 *
 * Falls back to the arccos horizon formula when fewer than 2 picks succeed
 * (e.g. zoomed-out view of the whole globe).
 */
export function inBbox(lat, lon, bbox) {
  if (!bbox) return true;
  return lat >= bbox.south && lat <= bbox.north &&
         lon >= bbox.west  && lon <= bbox.east;
}

export function computeBboxFromViewer(viewer) {
  const camCart = viewer.camera.positionCartographic;
  const alt = camCart.height;
  const camLat = CesiumMath.toDegrees(camCart.latitude);
  const camLon = CesiumMath.toDegrees(camCart.longitude);

  // At very high altitude the whole globe is visible — skip expensive picks
  const R = 6_371_000;
  if (alt > R * 0.5) {
    console.log(`[bbox] FULL GLOBE | alt:${Math.round(alt)}m`);
    return { south: -90, north: 90, west: -180, east: 180 };
  }

  const { clientWidth: w, clientHeight: h } = viewer.scene.canvas;

  // Sample a 7×7 grid for better coverage of tilted views
  const STEPS = 6;
  const samples = [];
  for (let ix = 0; ix <= STEPS; ix++) {
    for (let iy = 0; iy <= STEPS; iy++) {
      samples.push(new Cartesian2(
        (ix / STEPS) * w,
        (iy / STEPS) * h,
      ));
    }
  }

  const hits = samples
    .map(c => viewer.camera.pickEllipsoid(c, Ellipsoid.WGS84))
    .filter(Boolean);

  // Need a good ratio of hits to trust the pick-based bbox.
  // With tilted views, many rays miss — use horizon fallback instead.
  const hitRatio = hits.length / samples.length;

  if (hits.length >= 4 && hitRatio > 0.3) {
    const carts = hits.map(p => Cartographic.fromCartesian(p, Ellipsoid.WGS84));
    const lats = carts.map(c => CesiumMath.toDegrees(c.latitude));
    const lons = carts.map(c => CesiumMath.toDegrees(c.longitude));

    let pickBbox = {
      south: Math.min(...lats), north: Math.max(...lats),
      west:  Math.min(...lons), east:  Math.max(...lons),
    };

    // If not all rays hit, the pick bbox underestimates — expand with horizon angle
    if (hitRatio < 0.9) {
      const visAngleDeg = Math.acos(R / (R + alt)) * (180 / Math.PI);
      const expand = visAngleDeg * (1 - hitRatio); // more expansion when fewer hits
      pickBbox = {
        south: Math.max(pickBbox.south - expand, -90),
        north: Math.min(pickBbox.north + expand,  90),
        west:  Math.max(pickBbox.west  - expand, -180),
        east:  Math.min(pickBbox.east  + expand,  180),
      };
    }

    console.log(`[bbox] picks: ${hits.length}/${samples.length} (${(hitRatio*100).toFixed(0)}%) | S:${pickBbox.south.toFixed(1)} N:${pickBbox.north.toFixed(1)} W:${pickBbox.west.toFixed(1)} E:${pickBbox.east.toFixed(1)}`);
    return pickBbox;
  }

  // Fallback: horizon circle based on altitude
  const visAngleDeg = Math.acos(R / (R + alt)) * (180 / Math.PI);
  const pad = Math.min(visAngleDeg * 1.5, 90);
  const result = {
    south: Math.max(camLat - pad, -90), north: Math.min(camLat + pad,  90),
    west:  Math.max(camLon - pad, -180), east: Math.min(camLon + pad, 180),
  };
  console.log(`[bbox] FALLBACK (${hits.length} hits) | alt:${Math.round(alt)}m angle:${visAngleDeg.toFixed(1)}° | S:${result.south.toFixed(1)} N:${result.north.toFixed(1)} W:${result.west.toFixed(1)} E:${result.east.toFixed(1)}`);
  return result;
}
