import React, { useRef, useState, useEffect } from 'react';
import { Viewer, CameraFlyTo, ImageryLayer } from 'resium';
import { EllipsoidTerrainProvider, Cartesian3, Math as CesiumMath } from 'cesium';
import { useCamera } from '../hooks/useCamera';
import { DEFAULT_ALT, DEFAULT_PITCH } from '../providers/constants';
import { useSceneConfig } from '../hooks/useSceneConfig';
import { useMousePosition } from '../hooks/useMousePosition';
import { useFlights } from '../hooks/useFlights';
import { useFlightLayer } from '../hooks/useFlightLayer';
import { useFlightSelection } from '../hooks/useFlightSelection';
import { useFlyToMouse }      from '../hooks/useFlyToMouse';
import { useAirportLayer }    from '../hooks/useAirportLayer';
import { useWeatherLayer }    from '../hooks/useWeatherLayer';
import { useVessels }         from '../hooks/useVessels';
import { useVesselLayer }     from '../hooks/useVesselLayer';
import { useSatellites }      from '../hooks/useSatellites';
import { useSatelliteLayer }  from '../hooks/useSatelliteLayer';
import { computeBboxFromViewer } from '../utils/bboxUtils';

export default function Globe({ layers, activeLayerId, lighting, initialView, flyTarget, resetKey, onCameraChange, onMouseMove, onFlightSelect, onAirportSelect, onVesselSelect, showFlights, flightTypes, showAirports, airportTypes, showWeather, weatherOpacity, showVessels, vesselTypes, showSatellites, onSatelliteSelect, satelliteTypes }) {
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

  const { stateRef: flightStateRef, setSelected } = useFlightLayer(viewer, flights, flightTypes);
  const selectedIcaoRef = useRef(null);

  const emptySet = React.useMemo(() => new Set(), []);
  const effectiveAirportTypes = showAirports ? airportTypes : emptySet;
  const { airportDataRef, setSelectedAirport } = useAirportLayer(viewer, effectiveAirportTypes, bbox);

  // Vessels
  const vessels = useVessels(showVessels);
  const { stateRef: vesselStateRef, setSelected: setSelectedVessel } = useVesselLayer(viewer, vessels, vesselTypes);

  // Satellites
  const satellitesMap = useSatellites(showSatellites);
  const { stateRef: satelliteStateRef, setSelected: setSelectedSatellite } = useSatelliteLayer(viewer, satellitesMap, satelliteTypes);

  // Refs for type filters (read inside camera listener without re-creating it)
  const flightTypesRef = useRef(flightTypes);
  flightTypesRef.current = flightTypes;
  const vesselTypesRef = useRef(vesselTypes);
  vesselTypesRef.current = vesselTypes;
  const satelliteTypesRef = useRef(satelliteTypes);
  satelliteTypesRef.current = satelliteTypes;

  // Live visibility filter — runs on every camera change, no debounce, no API call.
  // Hides/shows already-loaded billboards instantly as the user pans/zooms.
  useEffect(() => {
    if (!viewer) return;
    const update = () => {
      const live = computeBboxFromViewer(viewer);
      const ft = flightTypesRef.current;
      const vt = vesselTypesRef.current;
      for (const [, entry] of flightStateRef.current) {
        const inView = !live ||
          (entry.lon >= live.west  && entry.lon <= live.east &&
           entry.lat >= live.south && entry.lat <= live.north);
        const visible = inView && (ft?.has(entry._category) ?? true);
        entry.billboard.show = visible;
        if (entry.callsign) entry.callsign.show = visible;
      }
      for (const [, entry] of vesselStateRef.current) {
        const inView = !live ||
          (entry.lon >= live.west  && entry.lon <= live.east &&
           entry.lat >= live.south && entry.lat <= live.north);
        const visible = inView && (vt?.has(entry._category) ?? true);
        entry.billboard.show = visible;
        if (entry.label) entry.label.show = visible;
      }
      const st = satelliteTypesRef.current;
      for (const [, entry] of satelliteStateRef.current) {
        const inView = !live ||
          (entry.lon >= live.west  && entry.lon <= live.east &&
           entry.lat >= live.south && entry.lat <= live.north);
        const visible = inView && (st?.has(entry._category) ?? true);
        entry.billboard.show = visible;
        if (entry.label) entry.label.show = visible;
      }
    };
    const removeListener = viewer.camera.changed.addEventListener(update);
    return () => removeListener();
  }, [viewer, flightStateRef, vesselStateRef, satelliteStateRef]);

  // Re-apply type filter when flight/vessel types change
  useEffect(() => {
    for (const [, entry] of flightStateRef.current) {
      const show = flightTypes?.has(entry._category) ?? true;
      entry.billboard.show = show;
      if (entry.callsign) entry.callsign.show = show;
    }
  }, [flightTypes]);

  useEffect(() => {
    for (const [, entry] of vesselStateRef.current) {
      const show = vesselTypes?.has(entry._category) ?? true;
      entry.billboard.show = show;
      if (entry.label) entry.label.show = show;
    }
  }, [vesselTypes]);

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

  useFlightSelection(viewer, flightStateRef, handleFlightSelect, airportDataRef, onAirportSelect, setSelectedAirport, vesselStateRef, onVesselSelect, setSelectedVessel, satelliteStateRef, onSatelliteSelect, setSelectedSatellite);
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
