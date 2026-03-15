import React, { useRef, useState, useEffect } from 'react';
import { Viewer, ImageryLayer } from 'resium';
import { EllipsoidTerrainProvider, Cartesian3, Math as CesiumMath, Ion, createWorldTerrainAsync } from 'cesium';
import { DEFAULT_ALT, DEFAULT_PITCH } from '../providers/constants';
import { computeBboxFromViewer } from '../utils/bboxUtils';
import { useLayerState } from '../contexts/LayerContext';
import { ViewerProvider } from '../contexts/ViewerContext';
import { SelectionProvider } from '../contexts/SelectionContext';
import { layers } from '../providers/layers';

import SceneManager from './layers/SceneManager';
import WeatherManager from './layers/WeatherManager';
import RouteManager from './layers/RouteManager';
import ReceiverManager from './layers/ReceiverManager';
import AirportManager from './layers/AirportManager';
import TelecomManager from './layers/TelecomManager';
import SatelliteManager from './layers/SatelliteManager';
import VesselManager from './layers/VesselManager';
import FlightManager from './layers/FlightManager';
import AtcManager from './layers/AtcManager';
import MilitaryManager from './layers/MilitaryManager';
import VisibilityManager from './layers/VisibilityManager';

export default function Globe({ initialView, flyTarget, resetKey, onCameraChange, onMouseMove, onFlightSelect, onAirportSelect, onVesselSelect, onSatelliteSelect, onTelecomSelect, onReceiverSelect, onAtcSelect, onMilitarySelect }) {
  const envCfg = useLayerState('environment');

  const viewerRef = useRef(null);
  const wrapperRef = useRef(null);
  const [viewer, setViewer] = useState(null);
  const [cameraAltitude, setCameraAltitude] = useState(Infinity);

  useEffect(() => {
    const check = () => {
      const v = viewerRef.current?.cesiumElement;
      if (v) setViewer(v);
      else requestAnimationFrame(check);
    };
    check();
  }, []);

  // Reveal globe after imagery tiles load
  useEffect(() => {
    if (!viewer) return;
    const wrapper = wrapperRef.current;
    let revealed = false;

    const reveal = () => {
      if (revealed) return;
      revealed = true;
      if (wrapper) wrapper.style.visibility = 'visible';
      console.log('[globe] revealed');
    };

    const token = import.meta.env.VITE_CESIUM_ION_TOKEN;
    if (token) Ion.defaultAccessToken = token;

    if (viewer.scene.globe.tilesLoaded) {
      reveal();
    } else {
      const remove = viewer.scene.globe.tileLoadProgressEvent.addEventListener((remaining) => {
        if (remaining === 0) { remove(); reveal(); }
      });
    }

    setTimeout(reveal, 8000);
  }, [viewer]);

  // 3D terrain toggle
  const worldTerrainRef = useRef(null);
  const flatTerrain = useRef(new EllipsoidTerrainProvider());

  useEffect(() => {
    if (!viewer) return;
    if (!envCfg.terrain) {
      viewer.terrainProvider = flatTerrain.current;
      return;
    }
    if (!import.meta.env.VITE_CESIUM_ION_TOKEN) return;

    if (worldTerrainRef.current) {
      viewer.terrainProvider = worldTerrainRef.current;
    } else {
      createWorldTerrainAsync().then(tp => {
        worldTerrainRef.current = tp;
        viewer.terrainProvider = tp;
        console.log('[terrain] 3D terrain active');
      }).catch(e => {
        console.error('[terrain] failed:', e.message);
      });
    }
  }, [viewer, envCfg.terrain]);

  // Bbox tracking
  const [bbox, setBbox] = useState(undefined);

  useEffect(() => {
    if (!viewer) return;
    const lastKeyRef = { current: null };

    const onBboxUpdate = () => {
      const next = computeBboxFromViewer(viewer);
      const key = next === null ? '__global__'
        : `${next.south.toFixed(1)},${next.west.toFixed(1)},${next.north.toFixed(1)},${next.east.toFixed(1)}`;
      if (key === lastKeyRef.current) return;
      lastKeyRef.current = key;
      setBbox(next);
      const cart = viewer.camera.positionCartographic;
      if (cart) setCameraAltitude(cart.height);
    };

    onBboxUpdate();
    const removeListener = viewer.camera.changed.addEventListener(onBboxUpdate);
    return () => removeListener();
  }, [viewer]);

  // Force re-render when imagery layer changes (requestRenderMode = true)
  useEffect(() => {
    if (viewer) viewer.scene.requestRender();
  }, [viewer, envCfg.layerId]);

  // Bridge refs for visibility filter (managers populate, VisibilityManager reads)
  const flightStateRef  = useRef(null);
  const vesselStateRef  = useRef(null);
  const satelliteStateRef = useRef(null);
  const telecomExtRef   = useRef(null);

  // ── Camera navigation ─────────────────────────────────────────────────────
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
        DEFAULT_ALT
      ),
      orientation: {
        heading: CesiumMath.toRadians(0),
        pitch: CesiumMath.toRadians(DEFAULT_PITCH),
        roll: 0,
      },
      duration: 2,
    });
  }, [resetKey, viewer]);

  const lastFlyTsRef = useRef(null);
  useEffect(() => {
    if (!viewer || !flyTarget) return;
    if (flyTarget.ts === lastFlyTsRef.current) return;
    lastFlyTsRef.current = flyTarget.ts;

    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(flyTarget.lon, flyTarget.lat, flyTarget.alt ?? 50_000),
      orientation: {
        heading: CesiumMath.toRadians(0),
        pitch: CesiumMath.toRadians(flyTarget.pitch ?? -90),
        roll: 0,
      },
      duration: 2.5,
    });
  }, [viewer, flyTarget]);

  return (
    <div ref={wrapperRef} style={{ visibility: 'hidden', width: '100%', height: '100%' }}>
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
          <ImageryLayer imageryProvider={layer.base} show={layer.id === envCfg.layerId} />
          {layer.overlay && (
            <ImageryLayer imageryProvider={layer.overlay} show={layer.id === envCfg.layerId} />
          )}
        </React.Fragment>
      ))}
    </Viewer>
    <ViewerProvider value={viewer}>
      <SelectionProvider>
        <SceneManager onCameraChange={onCameraChange} onMouseMove={onMouseMove} />
        <WeatherManager />
        <RouteManager bbox={bbox} />
        <ReceiverManager onReceiverSelect={onReceiverSelect} />
        <AirportManager bbox={bbox} onAirportSelect={onAirportSelect} />
        <AtcManager onAtcSelect={onAtcSelect} />
        <MilitaryManager onMilitarySelect={onMilitarySelect} />
        <TelecomManager cameraAltitude={cameraAltitude} telecomStateRef={telecomExtRef} onTelecomSelect={onTelecomSelect} />
        <SatelliteManager satelliteStateRef={satelliteStateRef} onSatelliteSelect={onSatelliteSelect} />
        <VesselManager vesselStateRef={vesselStateRef} onVesselSelect={onVesselSelect} />
        <FlightManager bbox={bbox} onFlightSelect={onFlightSelect} flightStateRef={flightStateRef} />
        {/* VisibilityManager MUST render after entity managers so refs are populated */}
        <VisibilityManager
          flightStateRef={flightStateRef}
          vesselStateRef={vesselStateRef}
          satelliteStateRef={satelliteStateRef}
          telecomExtRef={telecomExtRef}
        />
      </SelectionProvider>
    </ViewerProvider>
    </div>
  );
}
