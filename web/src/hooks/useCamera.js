import { useEffect } from 'react';
import { Math as CesiumMath } from 'cesium';
import { CAMERA_CHANGE_PCT } from '../providers/constants';

export function useCamera(viewer, onCameraChange) {
  useEffect(() => {
    if (!viewer) return;

    const update = () => {
      const cart = viewer.camera.positionCartographic;
      if (!cart) return;
      onCameraChange({
        lat: CesiumMath.toDegrees(cart.latitude).toFixed(4),
        lon: CesiumMath.toDegrees(cart.longitude).toFixed(4),
        alt: (cart.height / 1000).toFixed(0),
      });
    };

    viewer.camera.percentageChanged = CAMERA_CHANGE_PCT;
    viewer.camera.changed.addEventListener(update);
    viewer.camera.moveEnd.addEventListener(update);
    update();

    return () => {
      viewer.camera.changed.removeEventListener(update);
      viewer.camera.moveEnd.removeEventListener(update);
    };
  }, [viewer, onCameraChange]);
}
