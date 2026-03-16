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
  const { clientWidth: w, clientHeight: h } = viewer.scene.canvas;

  // Sample a 5×5 grid + extra midpoints along the edges.
  // Total ≈ 25 picks — cheap enough for every camera-changed event.
  const STEPS = 4;
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

  if (hits.length >= 2) {
    const carts = hits.map(p => Cartographic.fromCartesian(p, Ellipsoid.WGS84));
    const lats = carts.map(c => CesiumMath.toDegrees(c.latitude));
    const lons = carts.map(c => CesiumMath.toDegrees(c.longitude));
    const result = {
      south: Math.min(...lats), north: Math.max(...lats),
      west:  Math.min(...lons), east:  Math.max(...lons),
    };
    console.log(`[bbox] picks: ${hits.length}/${samples.length} | S:${result.south.toFixed(1)} N:${result.north.toFixed(1)} W:${result.west.toFixed(1)} E:${result.east.toFixed(1)}`);
    return result;
  }

  // Fallback: horizon circle based on altitude.
  const camCart = viewer.camera.positionCartographic;
  const alt = camCart.height;
  const R = 6_371_000;
  const visAngleDeg = Math.acos(R / (R + alt)) * (180 / Math.PI);
  const pad = Math.min(visAngleDeg * 1.5, 90);
  const lat = CesiumMath.toDegrees(camCart.latitude);
  const lon = CesiumMath.toDegrees(camCart.longitude);
  const result = {
    south: Math.max(lat - pad, -90), north: Math.min(lat + pad,  90),
    west:  Math.max(lon - pad, -180), east: Math.min(lon + pad, 180),
  };
  console.log(`[bbox] FALLBACK (${hits.length} hits) | alt:${Math.round(alt)}m angle:${visAngleDeg.toFixed(1)}° | S:${result.south.toFixed(1)} N:${result.north.toFixed(1)} W:${result.west.toFixed(1)} E:${result.east.toFixed(1)}`);
  return result;
}
