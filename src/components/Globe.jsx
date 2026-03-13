import React, { useRef, useState, useEffect } from 'react';
import { Viewer, CameraFlyTo, ImageryLayer } from 'resium';
import { EllipsoidTerrainProvider, Cartesian3, Math as CesiumMath } from 'cesium';
import { useCamera } from '../hooks/useCamera';
import { useSceneConfig } from '../hooks/useSceneConfig';
import { useMousePosition } from '../hooks/useMousePosition';
import { useFlights } from '../hooks/useFlights';
import { useFlightLayer } from '../hooks/useFlightLayer';
import { useFlightSelection } from '../hooks/useFlightSelection';
import { useFlyToMouse }      from '../hooks/useFlyToMouse';

export default function Globe({ layers, activeLayerId, lighting, initialView, flyTarget, resetKey, onCameraChange, onMouseMove }) {
  const viewerRef = useRef(null);
  const [viewer, setViewer] = useState(null);

  // Capture the cesiumElement as state so hooks rerun when it becomes available
  useEffect(() => {
    const check = () => {
      const v = viewerRef.current?.cesiumElement;
      if (v) setViewer(v);
      else requestAnimationFrame(check);
    };
    check();
  }, []);

  useCamera(viewer, onCameraChange);
  useSceneConfig(viewer, { lighting });
  useMousePosition(viewer, onMouseMove);
  const flights = useFlights();
  const { stateRef: flightStateRef, setSelected } = useFlightLayer(viewer, flights);
  useFlightSelection(viewer, flightStateRef, setSelected);
  useFlyToMouse(viewer);

  useEffect(() => {
    if (!viewer || !initialView) return;
    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(initialView.lon, initialView.lat, initialView.alt),
      orientation: {
        heading: CesiumMath.toRadians(0),
        pitch: CesiumMath.toRadians(initialView.pitch ?? -90),
        roll: 0,
      },
    });
  }, [viewer, initialView]);

  useEffect(() => {
    if (!resetKey || !viewer) return;
    const cart = viewer.camera.positionCartographic;
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(
        CesiumMath.toDegrees(cart.longitude),
        CesiumMath.toDegrees(cart.latitude),
        20000000
      ),
      orientation: {
        heading: CesiumMath.toRadians(0),
        pitch: CesiumMath.toRadians(-90),
        roll: 0,
      },
      duration: 2,
    });
  }, [resetKey, viewer]);

  const destination = flyTarget
    ? Cartesian3.fromDegrees(flyTarget.lon, flyTarget.lat, flyTarget.alt ?? 300000)
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
      {layers.map((layer) => (
        <React.Fragment key={layer.id}>
          <ImageryLayer imageryProvider={layer.base} show={layer.id === activeLayerId} />
          {layer.overlay && (
            <ImageryLayer imageryProvider={layer.overlay} show={layer.id === activeLayerId} />
          )}
        </React.Fragment>
      ))}

      {destination && (
        <CameraFlyTo
          destination={destination}
          orientation={{
            heading: CesiumMath.toRadians(0),
            pitch: CesiumMath.toRadians(flyTarget.pitch ?? -45),
            roll: 0,
          }}
          duration={2.5}
        />
      )}
    </Viewer>
  );
}
