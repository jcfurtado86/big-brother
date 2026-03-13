import { Cartesian2, Cartographic, Ellipsoid, Math as CesiumMath } from 'cesium';

/**
 * Computes the visible bounding box from the current camera.
 * Uses corner picking when the globe edges are visible; falls back to the
 * arccos horizon formula for high-altitude views.
 */
export function computeBboxFromViewer(viewer) {
  const { clientWidth: w, clientHeight: h } = viewer.scene.canvas;
  const corners = [
    new Cartesian2(0, 0), new Cartesian2(w, 0),
    new Cartesian2(w, h), new Cartesian2(0, h),
  ];
  const hits = corners
    .map(c => viewer.camera.pickEllipsoid(c, Ellipsoid.WGS84))
    .filter(Boolean);

  if (hits.length >= 2) {
    const carts = hits.map(p => Cartographic.fromCartesian(p, Ellipsoid.WGS84));
    const lats = carts.map(c => CesiumMath.toDegrees(c.latitude));
    const lons = carts.map(c => CesiumMath.toDegrees(c.longitude));
    return {
      south: Math.min(...lats), north: Math.max(...lats),
      west:  Math.min(...lons), east:  Math.max(...lons),
    };
  }

  const camCart = viewer.camera.positionCartographic;
  const alt = camCart.height;
  const R = 6_371_000;
  const visAngleDeg = Math.acos(R / (R + alt)) * (180 / Math.PI);
  const pad = Math.min(visAngleDeg * 1.5, 90);
  const lat = CesiumMath.toDegrees(camCart.latitude);
  const lon = CesiumMath.toDegrees(camCart.longitude);
  return {
    south: Math.max(lat - pad, -90), north: Math.min(lat + pad,  90),
    west:  Math.max(lon - pad, -180), east: Math.min(lon + pad, 180),
  };
}
