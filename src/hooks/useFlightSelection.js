import { useEffect, useRef } from 'react';
import {
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Cartesian3,
  ColorMaterialProperty,
  CallbackProperty,
  defined,
} from 'cesium';
import { getProvider }     from '../providers/flightProviders';
import { deadReckon }      from '../utils/geoMath';
import { useCameraFollow } from './useCameraFollow';
import { TRACK_COLOR } from '../providers/constants';
import { getSetting } from '../providers/settingsStore';
import { parseTLEOrbitalElements } from '../providers/satelliteService';

export function useFlightSelection(viewer, flightStateRef, setSelected, airportDataRef, onAirportSelect, setSelectedAirport, vesselStateRef, onVesselSelect, setSelectedVessel, satelliteStateRef, onSatelliteSelect, setSelectedSatellite, providerName = 'opensky') {
  const selectionRef    = useRef(null); // { entity, icao24 }
  const pendingRef      = useRef(0);
  const liveIntervalRef = useRef(null);

  // Stable refs for callbacks — avoid re-subscribing the click handler.
  const setSelectedRef         = useRef(setSelected);
  const onAirportSelectRef     = useRef(onAirportSelect);
  const setSelectedAirportRef  = useRef(setSelectedAirport);
  const onVesselSelectRef      = useRef(onVesselSelect);
  const setSelectedVesselRef   = useRef(setSelectedVessel);
  const onSatelliteSelectRef   = useRef(onSatelliteSelect);
  const setSelectedSatelliteRef = useRef(setSelectedSatellite);
  useEffect(() => { setSelectedRef.current = setSelected; }, [setSelected]);
  useEffect(() => { onAirportSelectRef.current = onAirportSelect; }, [onAirportSelect]);
  useEffect(() => { setSelectedAirportRef.current = setSelectedAirport; }, [setSelectedAirport]);
  useEffect(() => { onVesselSelectRef.current = onVesselSelect; }, [onVesselSelect]);
  useEffect(() => { setSelectedVesselRef.current = setSelectedVessel; }, [setSelectedVessel]);
  useEffect(() => { onSatelliteSelectRef.current = onSatelliteSelect; }, [onSatelliteSelect]);
  useEffect(() => { setSelectedSatelliteRef.current = setSelectedSatellite; }, [setSelectedSatellite]);

  const { startFollow, stopFollow, updateFollow } = useCameraFollow(viewer);

  useEffect(() => {
    if (!viewer) return;

    const canvas = viewer.scene.canvas;

    // Release follow on drag > 4px.
    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      const startX = e.clientX;
      const startY = e.clientY;
      const onMove = (me) => {
        if (Math.abs(me.clientX - startX) > 4 || Math.abs(me.clientY - startY) > 4) {
          stopFollow();
          cleanup();
        }
      };
      const cleanup = () => {
        canvas.removeEventListener('mousemove', onMove);
        canvas.removeEventListener('mouseup',   cleanup);
      };
      canvas.addEventListener('mousemove', onMove);
      canvas.addEventListener('mouseup',   cleanup, { once: true });
    };
    canvas.addEventListener('mousedown', onMouseDown);

    // Pointer cursor on hoverable entities
    const hoverHandler = new ScreenSpaceEventHandler(canvas);
    hoverHandler.setInputAction((movement) => {
      if (viewer.isDestroyed()) return;
      const picks = viewer.scene.drillPick(movement.endPosition, 5);
      const hit = picks.find(p => defined(p) && typeof p.id === 'string');
      canvas.style.cursor = hit ? 'pointer' : 'default';
    }, ScreenSpaceEventType.MOUSE_MOVE);

    const clearSelection = () => {
      if (selectionRef.current) {
        viewer.entities.remove(selectionRef.current.entity);
        selectionRef.current = null;
      }
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = null;
      }
      stopFollow();
    };

    /** Deselect every entity type, then call clearSelection(). */
    const clearAll = () => {
      clearSelection();
      setSelectedRef.current(null);
      setSelectedAirportRef.current?.(null);
      onAirportSelectRef.current?.(null);
      setSelectedVesselRef.current?.(null);
      onVesselSelectRef.current?.(null);
      setSelectedSatelliteRef.current?.(null);
      onSatelliteSelectRef.current?.(null);
    };

    // ── Click dispatch ─────────────────────────────────────────────────

    const handler = new ScreenSpaceEventHandler(canvas);

    handler.setInputAction(async (click) => {
      if (viewer.isDestroyed()) return;
      const picks = viewer.scene.drillPick(click.position, 5);
      const picked = picks.find(p => defined(p) && typeof p.id === 'string');
      viewer.selectedEntity = undefined;
      const rawId = picked?.id ?? null;

      // Airport
      if (rawId?.startsWith('apt:')) {
        const aptIcao = rawId.slice(4);
        clearAll();
        setSelectedAirportRef.current?.(aptIcao);
        onAirportSelectRef.current?.(airportDataRef?.current?.get(aptIcao) ?? null);
        return;
      }

      // Vessel
      if (rawId?.startsWith('vessel_')) {
        const mmsi = rawId.slice(7);
        const vesselEntry = vesselStateRef?.current?.get(mmsi);
        clearAll();
        setSelectedVesselRef.current?.(mmsi);
        onVesselSelectRef.current?.(vesselEntry?.vessel ?? null);

        // Camera follow
        if (vesselEntry) {
          startFollow(Cartesian3.fromDegrees(vesselEntry.lon, vesselEntry.lat, 0));
          liveIntervalRef.current = setInterval(() => {
            const entry = vesselStateRef?.current?.get(mmsi);
            if (!entry) return;
            const pos = Cartesian3.fromDegrees(entry.lon, entry.lat, 0);
            updateFollow(pos);
            onVesselSelectRef.current?.(entry.vessel ?? null);
          }, getSetting('TICK_INTERVAL_MS'));
        }
        return;
      }

      // Satellite
      if (rawId?.startsWith('sat_')) {
        const noradId = rawId.slice(4);
        const satEntry = satelliteStateRef?.current?.get(noradId);
        const orbital = satEntry?.tle ? parseTLEOrbitalElements(satEntry.tle) : null;
        const satData = satEntry ? {
          name: satEntry._name, noradId,
          lat: satEntry.lat, lon: satEntry.lon,
          alt: satEntry.alt, velocity: satEntry.velocity,
          ...orbital,
        } : null;

        clearAll();
        setSelectedSatelliteRef.current?.(noradId);
        onSatelliteSelectRef.current?.(satData);

        // Camera follow
        if (satEntry) {
          const altM = (satEntry.alt ?? 400) * 1000;
          startFollow(Cartesian3.fromDegrees(satEntry.lon, satEntry.lat, altM));
          liveIntervalRef.current = setInterval(() => {
            const entry = satelliteStateRef?.current?.get(noradId);
            if (!entry) return;
            const pos = Cartesian3.fromDegrees(entry.lon, entry.lat, (entry.alt ?? 400) * 1000);
            updateFollow(pos);
            onSatelliteSelectRef.current?.({
              name: entry._name, noradId,
              lat: entry.lat, lon: entry.lon,
              alt: entry.alt, velocity: entry.velocity,
              ...orbital,
            });
          }, getSetting('TICK_INTERVAL_MS'));
        }
        return;
      }

      // Flight (default — no prefix)
      const icao24 = rawId;
      const isSame = selectionRef.current?.icao24 === icao24;

      const token = ++pendingRef.current;
      clearAll();
      setSelectedRef.current(isSame ? null : icao24);
      if (!icao24 || isSame) return;

      try {
        const effectiveProvider = providerName === 'all' ? 'opensky' : providerName;
        const trackPoints = await getProvider(effectiveProvider).fetchTrack(icao24);
        if (token !== pendingRef.current) return;
        if (!trackPoints || trackPoints.length < 2) return;

        const positions = trackPoints.map(({ lat, lon, alt }) =>
          Cartesian3.fromDegrees(lon, lat, alt)
        );

        const liveEndRef = { current: positions[positions.length - 1] };
        const dynamicPositions = new CallbackProperty(
          () => [...positions.slice(0, -1), liveEndRef.current],
          false
        );

        const entity = viewer.entities.add({
          polyline: {
            positions: dynamicPositions,
            width: 1.5,
            material: new ColorMaterialProperty(TRACK_COLOR),
            clampToGround: false,
            arcType: 0,
          },
        });

        selectionRef.current = { entity, icao24 };

        const entry0 = flightStateRef?.current?.get(icao24);
        if (entry0) {
          const dt0 = Date.now() - entry0.fetchedAt;
          const { lat: lat0, lon: lon0 } = deadReckon(
            entry0.lat, entry0.lon, entry0.heading, entry0.velocity, dt0
          );
          startFollow(Cartesian3.fromDegrees(lon0, lat0, (entry0._alt ?? 0) * getSetting('FLIGHT_ALT_SCALE')));
        }

        liveIntervalRef.current = setInterval(() => {
          const entry = flightStateRef?.current?.get(icao24);
          if (!entry) return;
          const dt = Date.now() - entry.fetchedAt;
          const { lat, lon } = deadReckon(
            entry.lat, entry.lon, entry.heading, entry.velocity, dt
          );
          const pos = Cartesian3.fromDegrees(lon, lat, (entry._alt ?? 0) * getSetting('FLIGHT_ALT_SCALE'));
          liveEndRef.current = pos;
          updateFollow(pos);
        }, getSetting('TICK_INTERVAL_MS'));

      } catch (e) {
        console.error('[selection] track error:', e);
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
      hoverHandler.destroy();
      canvas.style.cursor = 'default';
      canvas.removeEventListener('mousedown', onMouseDown);
      clearSelection();
    };
  }, [viewer, startFollow, stopFollow, updateFollow]);
}
