import { useEffect } from 'react';
import { Cartesian2, Cartographic, Ellipsoid, Math as CesiumMath } from 'cesium';

export function useMousePosition(viewerRef, onMouseMove) {
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;

    let canvas = null;
    let attached = false;

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

    const handleLeave = () => onMouseMove(null);

    const attach = () => {
      if (attached) return;
      attached = true;
      viewer.scene.postRender.removeEventListener(attach);
      canvas = viewer.scene.canvas;
      canvas.addEventListener('mousemove', handleMove);
      canvas.addEventListener('mouseleave', handleLeave);
    };

    viewer.scene.postRender.addEventListener(attach);

    return () => {
      viewer.scene.postRender.removeEventListener(attach);
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMove);
        canvas.removeEventListener('mouseleave', handleLeave);
      }
    };
  }, [viewerRef, onMouseMove]);
}
