import { useEffect } from 'react';
import { Cartesian2, Cartographic, Ellipsoid, Math as CesiumMath } from 'cesium';

export function useMousePosition(viewerRef, onMouseMove) {
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;

    const canvas = viewer.scene.canvas;

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const pos = new Cartesian2(e.clientX - rect.left, e.clientY - rect.top);
      const cartesian = viewer.camera.pickEllipsoid(pos, Ellipsoid.WGS84);
      if (!cartesian) {
        onMouseMove(null);
        return;
      }
      const cart = Cartographic.fromCartesian(cartesian, Ellipsoid.WGS84);
      onMouseMove({
        lat: CesiumMath.toDegrees(cart.latitude).toFixed(4),
        lon: CesiumMath.toDegrees(cart.longitude).toFixed(4),
      });
    };

    const handleMouseLeave = () => onMouseMove(null);

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [viewerRef, onMouseMove]);
}
