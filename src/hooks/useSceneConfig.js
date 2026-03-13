import { useEffect } from 'react';
import { CameraEventType, ClockStep } from 'cesium';

export function useSceneConfig(viewer, { lighting } = {}) {
  useEffect(() => {
    if (!viewer) return;

    viewer.scene.skyAtmosphere.show = true;
    viewer.scene.fog.enabled = true;

    const ctrl = viewer.scene.screenSpaceCameraController;
    ctrl.minimumZoomDistance = Number(import.meta.env.VITE_ZOOM_MIN_M  ?? 100);
    ctrl.maximumZoomDistance = Number(import.meta.env.VITE_ZOOM_MAX_M  ?? 30000000);
    ctrl.inertiaZoom = 0;
    ctrl.zoomEventTypes = [CameraEventType.RIGHT_DRAG, CameraEventType.PINCH];

    const canvas = viewer.scene.canvas;
    const onWheel = (e) => {
      e.preventDefault();
      const height = viewer.camera.positionCartographic?.height ?? 1000;
      const clamped = Math.max(100, height);
      const amount = (Math.abs(e.deltaY) / 100) * clamped * Number(import.meta.env.VITE_ZOOM_SENSITIVITY ?? 0.12);
      if (e.deltaY > 0) {
        viewer.camera.zoomOut(amount);
      } else {
        viewer.camera.zoomIn(amount);
      }
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [viewer]);

  useEffect(() => {
    if (!viewer) return;
    viewer.scene.globe.enableLighting = !!lighting;
    if (lighting) {
      viewer.clock.clockStep = ClockStep.SYSTEM_CLOCK;
      viewer.clock.shouldAnimate = true;
    } else {
      viewer.clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
      viewer.clock.shouldAnimate = false;
    }
  }, [viewer, lighting]);
}
