import { useEffect } from 'react';
import { Cartesian2, Cartographic, Ellipsoid, Math as CesiumMath } from 'cesium';

export function useMousePosition(viewer, onMouseMove) {
  useEffect(() => {
    if (!viewer) return;

    const canvas = viewer.scene.canvas;

    const handleMove = (e) => {
      const pos = new Cartesian2(e.offsetX, e.offsetY);
      const cartesian = viewer.camera.pickEllipsoid(pos, Ellipsoid.WGS84);
      if (!cartesian) { onMouseMove(null); return; }
      const cart = Cartographic.fromCartesian(cartesian, Ellipsoid.WGS84);
      onMouseMove({
        lat: CesiumMath.toDegrees(cart.latitude).toFixed(4),
        lon: CesiumMath.toDegrees(cart.longitude).toFixed(4),
      });
    };

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseleave', () => onMouseMove(null));

    return () => {
      canvas.removeEventListener('mousemove', handleMove);
    };
  }, [viewer, onMouseMove]);
}
