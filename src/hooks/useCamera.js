import { useEffect } from 'react';
import { Math as CesiumMath } from 'cesium';

export function useCamera(viewerRef, onCameraChange) {
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;

    const handler = () => {
      const cart = viewer.camera.positionCartographic;
      if (!cart) return;
      onCameraChange({
        lat: CesiumMath.toDegrees(cart.latitude).toFixed(4),
        lon: CesiumMath.toDegrees(cart.longitude).toFixed(4),
        alt: (cart.height / 1000).toFixed(0),
      });
    };

    viewer.camera.changed.addEventListener(handler);
    return () => viewer.camera.changed.removeEventListener(handler);
  }, [viewerRef, onCameraChange]);
}
