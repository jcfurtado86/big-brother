import { useEffect } from 'react';
import { CameraEventType, ClockStep } from 'cesium';
import { ZOOM_MIN, ZOOM_MAX, ZOOM_SENSITIVITY } from '../providers/constants';

export function useSceneConfig(viewer, { lighting } = {}) {
  useEffect(() => {
    if (!viewer) return;

    // Render on demand — only re-render when something changes.
    // Animations (dead reckoning, satellite tick) call scene.requestRender().
    viewer.scene.requestRenderMode = true;
    viewer.scene.maximumRenderTimeChange = Infinity;

    // Reduce terrain detail for better FPS (default is 2)
    viewer.scene.globe.maximumScreenSpaceError = 4;

    viewer.scene.skyAtmosphere.show = true;
    viewer.scene.fog.enabled = true;

    const ctrl = viewer.scene.screenSpaceCameraController;
    ctrl.minimumZoomDistance = ZOOM_MIN;
    ctrl.maximumZoomDistance = ZOOM_MAX;
    ctrl.inertiaZoom = 0;
    ctrl.zoomEventTypes = [CameraEventType.RIGHT_DRAG, CameraEventType.PINCH];

    const canvas = viewer.scene.canvas;
    const onWheel = (e) => {
      e.preventDefault();
      const height = viewer.camera.positionCartographic?.height ?? 1000;
      if (e.deltaY > 0 && height >= ZOOM_MAX) return;
      if (e.deltaY < 0 && height <= ZOOM_MIN) return;
      const clamped = Math.max(ZOOM_MIN, height);
      const amount = (Math.abs(e.deltaY) / 100) * clamped * ZOOM_SENSITIVITY;
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
