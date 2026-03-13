import { useEffect, useRef } from 'react';
import {
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Cartesian3,
  ColorMaterialProperty,
  CallbackProperty,
  defined,
} from 'cesium';
import { fetchTrack }      from '../providers/flightService';
import { deadReckon }      from '../utils/geoMath';
import { useCameraFollow } from './useCameraFollow';
import { FLIGHT_ALTITUDE, TRACK_COLOR } from '../providers/constants';

export function useFlightSelection(viewer, flightStateRef, setSelected, airportDataRef, onAirportSelect) {
  const selectionRef    = useRef(null); // { entity, icao24 }
  const pendingRef      = useRef(0);
  const liveIntervalRef = useRef(null);
  const setSelectedRef  = useRef(setSelected);
  const onAirportSelectRef = useRef(onAirportSelect);
  useEffect(() => { setSelectedRef.current = setSelected; }, [setSelected]);
  useEffect(() => { onAirportSelectRef.current = onAirportSelect; }, [onAirportSelect]);

  const { startFollow, stopFollow, updateFollow } = useCameraFollow(viewer);

  useEffect(() => {
    if (!viewer) return;

    const canvas = viewer.scene.canvas;

    // Libera o follow quando o usuario arrasta o mapa (drag > 4px).
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

    // Cursor pointer ao passar sobre elementos clicáveis
    const hoverHandler = new ScreenSpaceEventHandler(canvas);
    hoverHandler.setInputAction((movement) => {
      const picked = viewer.scene.pick(movement.endPosition);
      canvas.style.cursor = (defined(picked) && typeof picked.id === 'string') ? 'pointer' : 'default';
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

    const handler = new ScreenSpaceEventHandler(canvas);

    handler.setInputAction(async (click) => {
      const picked = viewer.scene.pick(click.position);
      viewer.selectedEntity = undefined;
      const rawId = (defined(picked) && typeof picked.id === 'string') ? picked.id : null;

      // Click em aeroporto
      if (rawId && rawId.startsWith('apt:')) {
        const aptIcao = rawId.slice(4);
        const aptData = airportDataRef?.current?.get(aptIcao) ?? null;
        clearSelection();
        setSelectedRef.current(null);
        onAirportSelectRef.current?.(aptData);
        return;
      }

      // Click em voo
      const icao24 = rawId;
      const isSame = selectionRef.current?.icao24 === icao24;

      // Cancela fetch em andamento, limpa track e para follow.
      const token = ++pendingRef.current;
      clearSelection();
      onAirportSelectRef.current?.(null);

      setSelectedRef.current(isSame ? null : icao24);
      if (!icao24 || isSame) return;

      try {
        const trackPoints = await fetchTrack(icao24);
        if (token !== pendingRef.current) return;
        if (!trackPoints || trackPoints.length < 2) return;

        const positions = trackPoints.map(({ lat, lon, alt }) =>
          Cartesian3.fromDegrees(lon, lat, alt)
        );

        // Ultimo ponto e live — atualizado a cada segundo.
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

        // Aponta a camera para o aviao e inicia follow.
        const entry0 = flightStateRef?.current?.get(icao24);
        if (entry0) {
          const dt0 = Date.now() - entry0.fetchedAt;
          const { lat: lat0, lon: lon0 } = deadReckon(
            entry0.lat, entry0.lon, entry0.heading, entry0.velocity, dt0
          );
          startFollow(Cartesian3.fromDegrees(lon0, lat0, FLIGHT_ALTITUDE));
        }

        // A cada segundo: avanca o endpoint do track e translada a camera.
        liveIntervalRef.current = setInterval(() => {
          const entry = flightStateRef?.current?.get(icao24);
          if (!entry) return;
          const dt = Date.now() - entry.fetchedAt;
          const { lat, lon } = deadReckon(
            entry.lat, entry.lon, entry.heading, entry.velocity, dt
          );
          const pos = Cartesian3.fromDegrees(lon, lat, FLIGHT_ALTITUDE);
          liveEndRef.current = pos;
          updateFollow(pos);
        }, 1000);

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
