// Zoom in com flyby suave para o ponto do globo sob o cursor.
// Acionado por duplo-clique no mapa (fora de um aviao).

import { useEffect } from 'react';
import {
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Cartographic,
  Cartesian3,
} from 'cesium';

const MIN_ALT  = 2_000;   // altitude minima em metros
const ZOOM_FACTOR = 3;    // divide a altitude atual por este valor
const DURATION = 1.2;     // segundos

export function useFlyToMouse(viewer) {
  useEffect(() => {
    if (!viewer) return;

    // Remove o comportamento padrao do Cesium no duplo-clique
    // (que tenta rastrear entidades selecionadas).
    viewer.screenSpaceEventHandler.removeInputAction(
      ScreenSpaceEventType.LEFT_DOUBLE_CLICK
    );

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction((event) => {
      // Tenta pegar posicao exata na cena (com terreno); fallback para elipsoide.
      const cartesian =
        viewer.scene.pickPosition(event.position) ??
        viewer.camera.pickEllipsoid(event.position);

      if (!cartesian) return;

      const carto     = Cartographic.fromCartesian(cartesian);
      const currentAlt = viewer.camera.positionCartographic.height;
      const targetAlt  = Math.max(currentAlt / ZOOM_FACTOR, MIN_ALT);

      viewer.camera.flyTo({
        destination: Cartesian3.fromRadians(carto.longitude, carto.latitude, targetAlt),
        orientation: {
          heading: viewer.camera.heading,
          pitch:   viewer.camera.pitch,
          roll:    0,
        },
        duration: DURATION,
      });
    }, ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    return () => handler.destroy();
  }, [viewer]);
}
