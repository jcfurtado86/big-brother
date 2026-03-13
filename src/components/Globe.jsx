import React, { useRef } from 'react';
import { Viewer, CameraFlyTo, ImageryLayer } from 'resium';
import { EllipsoidTerrainProvider, Cartesian3, Math as CesiumMath } from 'cesium';
import { useCamera } from '../hooks/useCamera';
import { useSceneConfig } from '../hooks/useSceneConfig';

export default function Globe({ imageryProvider, flyTarget, onCameraChange }) {
  const viewerRef = useRef(null);

  useCamera(viewerRef, onCameraChange);
  useSceneConfig(viewerRef);

  const destination = flyTarget
    ? Cartesian3.fromDegrees(flyTarget.lon, flyTarget.lat, 300000)
    : undefined;

  return (
    <Viewer
      ref={viewerRef}
      full
      imageryProvider={false}
      baseLayerPicker={false}
      geocoder={false}
      homeButton={false}
      sceneModePicker={false}
      navigationHelpButton={false}
      animation={false}
      timeline={false}
      fullscreenButton={false}
      infoBox={false}
      selectionIndicator={false}
      terrainProvider={new EllipsoidTerrainProvider()}
    >
      <ImageryLayer imageryProvider={imageryProvider} />

      {destination && (
        <CameraFlyTo
          destination={destination}
          orientation={{
            heading: CesiumMath.toRadians(0),
            pitch: CesiumMath.toRadians(-45),
            roll: 0,
          }}
          duration={2.5}
        />
      )}
    </Viewer>
  );
}
