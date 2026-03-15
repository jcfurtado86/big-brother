// Responsabilidade unica: mover a camera em paralelo com o aviao selecionado.

import { useRef, useCallback } from 'react';
import { Cartesian3, HeadingPitchRange, Matrix4 } from 'cesium';

/**
 * @param {object} viewer - instancia do Cesium Viewer
 * @returns {{
 *   startFollow:  (planePos: Cartesian3) => void,
 *   stopFollow:   () => void,
 *   updateFollow: (newPos: Cartesian3) => void,
 * }}
 */
export function useCameraFollow(viewer) {
  const followRef       = useRef(false);
  const lastPlanePosRef = useRef(null);

  const stopFollow = useCallback(() => {
    followRef.current       = false;
    lastPlanePosRef.current = null;
  }, []);

  const startFollow = useCallback((planePos) => {
    if (!viewer) return;
    const hpr = new HeadingPitchRange(
      viewer.camera.heading,
      viewer.camera.pitch,
      Cartesian3.distance(viewer.camera.position, planePos)
    );
    viewer.camera.lookAt(planePos, hpr);
    viewer.camera.lookAtTransform(Matrix4.IDENTITY);
    followRef.current       = true;
    lastPlanePosRef.current = planePos.clone();
  }, [viewer]);

  const updateFollow = useCallback((newPos) => {
    if (!followRef.current || !lastPlanePosRef.current || !viewer) return;
    const delta = Cartesian3.subtract(newPos, lastPlanePosRef.current, new Cartesian3());
    viewer.camera.position = Cartesian3.add(viewer.camera.position, delta, new Cartesian3());
    lastPlanePosRef.current = newPos.clone();
  }, [viewer]);

  return { startFollow, stopFollow, updateFollow };
}
