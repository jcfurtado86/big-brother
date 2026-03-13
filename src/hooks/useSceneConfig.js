import { useEffect } from 'react';

export function useSceneConfig(viewerRef) {
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;
    viewer.scene.globe.enableLighting = true;
    viewer.scene.skyAtmosphere.show = true;
    viewer.scene.fog.enabled = true;
  }, [viewerRef]);
}
