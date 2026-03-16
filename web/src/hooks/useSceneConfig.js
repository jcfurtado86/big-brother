import { useEffect } from 'react';
import { CameraEventType, ClockStep } from 'cesium';
import { getSetting } from '../providers/settingsStore';

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
    ctrl.minimumZoomDistance = getSetting('ZOOM_MIN');
    ctrl.maximumZoomDistance = getSetting('ZOOM_MAX');
    ctrl.inertiaZoom = 0;
    ctrl.zoomEventTypes = [CameraEventType.RIGHT_DRAG, CameraEventType.PINCH];

    const canvas = viewer.scene.canvas;
    const onWheel = (e) => {
      e.preventDefault();
      const height = viewer.camera.positionCartographic?.height ?? 1000;
      const zoomMax = getSetting('ZOOM_MAX');
      const zoomMin = getSetting('ZOOM_MIN');
      if (e.deltaY > 0 && height >= zoomMax) return;
      if (e.deltaY < 0 && height <= zoomMin) return;
      const clamped = Math.max(zoomMin, height);
      const amount = (Math.abs(e.deltaY) / 100) * clamped * getSetting('ZOOM_SENSITIVITY');
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
      // Allow periodic re-renders so the day/night terminator moves
      viewer.scene.maximumRenderTimeChange = 1.0;
    } else {
      viewer.clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
      viewer.clock.shouldAnimate = false;
      viewer.scene.maximumRenderTimeChange = Infinity;
    }
    viewer.scene.requestRender();
  }, [viewer, lighting]);
}
