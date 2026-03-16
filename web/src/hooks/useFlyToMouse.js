// Zoom in com flyby suave para o ponto do globo sob o cursor.
// Acionado por duplo-clique no mapa (fora de um aviao).

import { useEffect } from 'react';
import {
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Cartographic,
  Cartesian3,
} from 'cesium';

import { getSetting } from '../providers/settingsStore';

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
      const targetAlt  = Math.max(currentAlt / getSetting('FLY_ZOOM_FACTOR'), getSetting('FLY_MIN_ALT'));

      viewer.camera.flyTo({
        destination: Cartesian3.fromRadians(carto.longitude, carto.latitude, targetAlt),
        orientation: {
          heading: viewer.camera.heading,
          pitch:   viewer.camera.pitch,
          roll:    0,
        },
        duration: getSetting('FLY_DURATION'),
      });
    }, ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    return () => handler.destroy();
  }, [viewer]);
}
