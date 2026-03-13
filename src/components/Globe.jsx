import React, { useRef, useState, useEffect } from 'react';
import { Viewer, CameraFlyTo, ImageryLayer } from 'resium';
import { EllipsoidTerrainProvider, Cartesian3, Cartesian2, Cartographic, Ellipsoid, Math as CesiumMath } from 'cesium';
import { useCamera } from '../hooks/useCamera';

const DEFAULT_ALT   = Number(import.meta.env.VITE_DEFAULT_ALT_M    ?? 10_000_000);
const DEFAULT_PITCH = Number(import.meta.env.VITE_DEFAULT_PITCH_DEG ?? -90);
import { useSceneConfig } from '../hooks/useSceneConfig';
import { useMousePosition } from '../hooks/useMousePosition';
import { useFlights } from '../hooks/useFlights';
import { useFlightLayer } from '../hooks/useFlightLayer';
import { useFlightSelection } from '../hooks/useFlightSelection';
import { useFlyToMouse }      from '../hooks/useFlyToMouse';
import { useAirportLayer }    from '../hooks/useAirportLayer';

// Computes the visible bounding box from the current camera.
// Uses corner picking when the globe edges are visible; falls back to the
// arccos horizon formula for high-altitude views. Never returns null —
// even at 10 000 km the user only sees ~half the globe, not the whole thing.
function computeBboxFromViewer(viewer) {
  const { clientWidth: w, clientHeight: h } = viewer.scene.canvas;
  const corners = [
    new Cartesian2(0, 0), new Cartesian2(w, 0),
    new Cartesian2(w, h), new Cartesian2(0, h),
  ];
  const hits = corners
    .map(c => viewer.camera.pickEllipsoid(c, Ellipsoid.WGS84))
    .filter(Boolean);

  if (hits.length >= 2) {
    const carts = hits.map(p => Cartographic.fromCartesian(p, Ellipsoid.WGS84));
    const lats = carts.map(c => CesiumMath.toDegrees(c.latitude));
    const lons = carts.map(c => CesiumMath.toDegrees(c.longitude));
    return {
      south: Math.min(...lats), north: Math.max(...lats),
      west:  Math.min(...lons), east:  Math.max(...lons),
    };
  }

  // Arccos horizon formula — works at any altitude.
  // At 10 000 km the visible cap is ~67°, so we fetch roughly one hemisphere.
  const camCart = viewer.camera.positionCartographic;
  const alt = camCart.height;
  const R = 6_371_000;
  const visAngleDeg = Math.acos(R / (R + alt)) * (180 / Math.PI);
  const pad = Math.min(visAngleDeg * 1.5, 90);
  const lat = CesiumMath.toDegrees(camCart.latitude);
  const lon = CesiumMath.toDegrees(camCart.longitude);
  return {
    south: Math.max(lat - pad, -90), north: Math.min(lat + pad,  90),
    west:  Math.max(lon - pad, -180), east: Math.min(lon + pad, 180),
  };
}

export default function Globe({ layers, activeLayerId, lighting, initialView, flyTarget, resetKey, onCameraChange, onMouseMove, onFlightSelect, showFlights, airportTypes }) {
  const viewerRef = useRef(null);
  const [viewer, setViewer] = useState(null);

  useEffect(() => {
    const check = () => {
      const v = viewerRef.current?.cesiumElement;
      if (v) setViewer(v);
      else requestAnimationFrame(check);
    };
    check();
  }, []);

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
    };

    onBboxUpdate(); // immediate on mount
    const removeListener = viewer.camera.changed.addEventListener(onBboxUpdate);
    return () => removeListener();
  }, [viewer]);

  useCamera(viewer, onCameraChange);
  useSceneConfig(viewer, { lighting });
  useMousePosition(viewer, onMouseMove);
  const flights = useFlights(showFlights, bbox);
  const flightsRef = useRef(flights);
  flightsRef.current = flights;

  const { stateRef: flightStateRef, setSelected } = useFlightLayer(viewer, flights);
  const selectedIcaoRef = useRef(null);

  // Live visibility filter — runs on every camera change, no debounce, no API call.
  // Hides/shows already-loaded billboards instantly as the user pans/zooms.
  useEffect(() => {
    if (!viewer) return;
    const update = () => {
      const live = computeBboxFromViewer(viewer);
      for (const [, entry] of flightStateRef.current) {
        const visible = !live ||
          (entry.lon >= live.west  && entry.lon <= live.east &&
           entry.lat >= live.south && entry.lat <= live.north);
        entry.billboard.show = visible;
        if (entry.callsign) entry.callsign.show = visible;
      }
    };
    const removeListener = viewer.camera.changed.addEventListener(update);
    return () => removeListener();
  }, [viewer, flightStateRef]);

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

  useFlightSelection(viewer, flightStateRef, handleFlightSelect);
  useFlyToMouse(viewer);
  useAirportLayer(viewer, airportTypes, bbox);

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
