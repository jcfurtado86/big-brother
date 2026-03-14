import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Viewer, ImageryLayer } from 'resium';
import { EllipsoidTerrainProvider, Cartesian3, Math as CesiumMath, Ion, createWorldTerrainAsync } from 'cesium';
import { useCamera } from '../hooks/useCamera';
import { DEFAULT_ALT, DEFAULT_PITCH } from '../providers/constants';
import { useSceneConfig } from '../hooks/useSceneConfig';
import { useMousePosition } from '../hooks/useMousePosition';
import { useFlights } from '../hooks/useFlights';
import { useFlightLayer } from '../hooks/useFlightLayer';
import { useFlightSelection } from '../hooks/useFlightSelection';
import { useVisibilityFilter } from '../hooks/useVisibilityFilter';
import { useFlyToMouse }      from '../hooks/useFlyToMouse';
import { useAirportLayer }    from '../hooks/useAirportLayer';
import { useWeatherLayer }    from '../hooks/useWeatherLayer';
import { useVessels }         from '../hooks/useVessels';
import { useVesselLayer }     from '../hooks/useVesselLayer';
import { useSatellites }      from '../hooks/useSatellites';
import { useSatelliteLayer }  from '../hooks/useSatelliteLayer';
import { useTelecom }         from '../hooks/useTelecom';
import { useTelecomLayer }    from '../hooks/useTelecomLayer';
import { computeBboxFromViewer } from '../utils/bboxUtils';

export default function Globe({ layers, activeLayerId, lighting, initialView, flyTarget, resetKey, onCameraChange, onMouseMove, onFlightSelect, onAirportSelect, onVesselSelect, showFlights, flightTypes, showAirports, airportTypes, showWeather, weatherOpacity, showVessels, vesselTypes, showSatellites, onSatelliteSelect, satelliteTypes, showTelecom, telecomTypes, flightProvider }) {
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

  // 3D terrain via Cesium Ion + reveal globe only after everything loads
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

    const waitForTiles = () => {
      if (viewer.scene.globe.tilesLoaded) {
        reveal();
      } else {
        const remove = viewer.scene.globe.tileLoadProgressEvent.addEventListener((remaining) => {
          if (remaining === 0) { remove(); reveal(); }
        });
      }
    };

    const token = import.meta.env.VITE_CESIUM_ION_TOKEN;
    if (!token) {
      console.warn('[terrain] no VITE_CESIUM_ION_TOKEN — using flat ellipsoid');
      waitForTiles();
    } else {
      Ion.defaultAccessToken = token;
      console.log('[terrain] loading Cesium World Terrain...');
      createWorldTerrainAsync().then(tp => {
        viewer.terrainProvider = tp;
        console.log('[terrain] 3D terrain active');
        // Wait for terrain tiles to load after provider swap
        waitForTiles();
      }).catch(e => {
        console.error('[terrain] failed:', e.message);
        waitForTiles();
      });
    }

    // Fallback: always reveal after 8s
    setTimeout(reveal, 8000);
  }, [viewer]);

  // undefined = viewer not ready (don't poll yet)
  // null      = whole globe visible (fetch all)
  // {...}     = regional view (fetch with bbox params)
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

    onBboxUpdate(); // immediate on mount
    const removeListener = viewer.camera.changed.addEventListener(onBboxUpdate);
    return () => removeListener();
  }, [viewer]);

  useCamera(viewer, onCameraChange);
  useSceneConfig(viewer, { lighting });
  useMousePosition(viewer, onMouseMove);
  const isAll = flightProvider === 'all';
  const openskyFlights = useFlights(showFlights && (flightProvider === 'opensky' || isAll), bbox, 'opensky');
  const alFlights      = useFlights(showFlights && (flightProvider === 'airplaneslive' || isAll), bbox, 'airplaneslive');

  const flights = useMemo(() => {
    if (isAll) {
      const merged = new Map();
      for (const [icao, os] of openskyFlights) {
        const al = alFlights.get(icao);
        if (al) {
          // Enrich OpenSky with AL-exclusive fields
          merged.set(icao, {
            ...os,
            military:     al.military,
            category:     al.category ?? os.category,
            verticalRate: al.verticalRate ?? os.verticalRate ?? null,
            squawk:       al.squawk ?? os.squawk ?? null,
            _meta:        al._meta ?? os._meta ?? null,
          });
        } else {
          merged.set(icao, os);
        }
      }
      // Add AL-only flights (not in OpenSky)
      for (const [icao, f] of alFlights) {
        if (!merged.has(icao)) merged.set(icao, f);
      }
      return merged;
    }
    if (flightProvider === 'opensky') return openskyFlights;
    return alFlights;
  }, [isAll, flightProvider, openskyFlights, alFlights]);

  const flightsRef = useRef(flights);
  flightsRef.current = flights;

  const { stateRef: flightStateRef, setSelected } = useFlightLayer(viewer, flights, flightTypes);
  const selectedIcaoRef = useRef(null);

  const emptySet = React.useMemo(() => new Set(), []);
  const effectiveAirportTypes = showAirports ? airportTypes : emptySet;
  const { airportDataRef, setSelectedAirport } = useAirportLayer(viewer, effectiveAirportTypes, bbox);

  // Vessels
  const vessels = useVessels(viewer, showVessels);
  const { stateRef: vesselStateRef, setSelected: setSelectedVessel } = useVesselLayer(viewer, vessels, vesselTypes);

  // Satellites
  const satellitesMap = useSatellites(showSatellites);
  const { stateRef: satelliteStateRef, setSelected: setSelectedSatellite } = useSatelliteLayer(viewer, satellitesMap, satelliteTypes);

  // Telecom — altitude-based category visibility
  // comm_line: any altitude, data_center: < 800km, mast: < 100km
  const showDC   = cameraAltitude < 800_000;
  const showMast = cameraAltitude < 100_000;
  const effectiveTelecomTypes = useMemo(() => {
    const types = new Set();
    for (const t of telecomTypes) {
      if (t === 'comm_line') types.add(t);
      else if (t === 'data_center' && showDC) types.add(t);
      else if (t === 'mast' && showMast) types.add(t);
    }
    return types;
  }, [telecomTypes, showDC, showMast]);

  const activeTelecomTypes = showTelecom ? effectiveTelecomTypes : emptySet;
  const { pointsMap: telecomPoints, lines: telecomLines } = useTelecom(viewer, showTelecom);
  const { stateRef: telecomStateRef } = useTelecomLayer(viewer, telecomPoints, telecomLines, activeTelecomTypes);

  // Visibility filter — camera-change + type toggles, all in one hook
  useVisibilityFilter(viewer, [
    { stateRef: flightStateRef,   types: flightTypes,    labelKey: 'label' },
    { stateRef: vesselStateRef,   types: vesselTypes,    labelKey: 'label' },
    { stateRef: satelliteStateRef, types: satelliteTypes, labelKey: 'label' },
    { stateRef: telecomStateRef,  types: activeTelecomTypes,   labelKey: 'label' },
  ]);

  const handleFlightSelect = React.useCallback((icao24) => {
    selectedIcaoRef.current = icao24 ?? null;
    setSelected(icao24);
    onFlightSelect?.(icao24 ? (flights.get(icao24) ?? null) : null);
  }, [setSelected, flights, onFlightSelect]);

  // Keep FlightCard in sync when flights Map refreshes (every 60s)
  useEffect(() => {
    const icao = selectedIcaoRef.current;
    if (!icao) return;
    onFlightSelect?.(flights.get(icao) ?? null);
  }, [flights, onFlightSelect]);

  useFlightSelection(viewer, flightStateRef, handleFlightSelect, airportDataRef, onAirportSelect, setSelectedAirport, vesselStateRef, onVesselSelect, setSelectedVessel, satelliteStateRef, onSatelliteSelect, setSelectedSatellite, flightProvider);
  useWeatherLayer(viewer, showWeather, weatherOpacity);
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

  // Imperative flyTo — runs once per flyTarget change (keyed by ts)
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
          <ImageryLayer imageryProvider={layer.base} show={layer.id === activeLayerId} />
          {layer.overlay && (
            <ImageryLayer imageryProvider={layer.overlay} show={layer.id === activeLayerId} />
          )}
        </React.Fragment>
      ))}
    </Viewer>
    </div>
  );
}
