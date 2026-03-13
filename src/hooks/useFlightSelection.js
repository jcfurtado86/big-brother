import { useEffect, useRef } from 'react';
import {
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Cartesian3,
  Color,
  ColorMaterialProperty,
  CallbackProperty,
  HeadingPitchRange,
  Matrix4,
  defined,
  Math as CesiumMath,
} from 'cesium';
import { openskyHeaders } from '../providers/openskyAuth';

const FLIGHT_ALTITUDE = Number(import.meta.env.VITE_FLIGHT_ALTITUDE_M ?? 10000);
const TRACK_COLOR     = Color.fromCssColorString(import.meta.env.VITE_TRACK_COLOR || '#A020F0')
                          .withAlpha(Number(import.meta.env.VITE_TRACK_OPACITY ?? 0.9));
const R = 6371000;

function deadReckon(lat, lon, heading, velocity, dtMs) {
  const dt = dtMs / 1000;
  const d  = velocity * dt;
  if (d === 0) return { lat, lon };
  const φ1 = CesiumMath.toRadians(lat);
  const λ1 = CesiumMath.toRadians(lon);
  const θ  = CesiumMath.toRadians(heading);
  const δ  = d / R;
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );
  const λ2 = λ1 + Math.atan2(
    Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
    Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
  );
  return { lat: CesiumMath.toDegrees(φ2), lon: CesiumMath.toDegrees(λ2) };
}

export function useFlightSelection(viewer, flightStateRef, setSelected) {
  const selectionRef    = useRef(null); // { entity, icao24 }
  const pendingRef      = useRef(0);
  const liveIntervalRef = useRef(null);
  const followRef       = useRef(false);        // true while camera is following the plane
  const lastPlanePosRef = useRef(null);         // Cartesian3 — previous tick's plane position

  useEffect(() => {
    if (!viewer) return;

    const releaseFollow = () => {
      followRef.current     = false;
      lastPlanePosRef.current = null;
    };

    const canvas = viewer.scene.canvas;

    // Release follow when the user pans (left-drag) the map.
    // A threshold of 4px distinguishes a drag from a plain click.
    const onMouseDown = (e) => {
      if (e.button !== 0 || !followRef.current) return;
      const startX = e.clientX;
      const startY = e.clientY;
      const onMove = (me) => {
        if (Math.abs(me.clientX - startX) > 4 || Math.abs(me.clientY - startY) > 4) {
          releaseFollow();
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

    const handler = new ScreenSpaceEventHandler(canvas);

    handler.setInputAction(async (click) => {
      const picked = viewer.scene.pick(click.position);
      viewer.selectedEntity = undefined;
      const icao24 = (defined(picked) && typeof picked.id === 'string') ? picked.id : null;

      const isSame = selectionRef.current?.icao24 === icao24;

      // Cancel any in-flight fetch, clear current track, stop following
      const token = ++pendingRef.current;
      if (selectionRef.current) {
        viewer.entities.remove(selectionRef.current.entity);
        selectionRef.current = null;
      }
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = null;
      }
      releaseFollow();

      setSelected(isSame ? null : icao24);
      if (!icao24 || isSame) return;

      try {
        const headers = await openskyHeaders();
        const res = await fetch(`/api/opensky-track?icao24=${icao24}&time=0`, { headers });
        if (token !== pendingRef.current) return;
        if (!res.ok) return;
        const data = await res.json();
        if (token !== pendingRef.current) return;
        if (!data?.path?.length) return;

        const positions = data.path
          .filter(([, lat, lon]) => lat != null && lon != null)
          .map(([, lat, lon, baroAlt]) =>
            Cartesian3.fromDegrees(lon, lat, Math.max(baroAlt ?? 0, 500) + 2000)
          );

        if (positions.length < 2) return;

        // Last point is live — updated every second to follow the plane
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

        // Point the camera at the plane without locking it (lookAt + immediate unlock).
        // This preserves normal camera controls (left=pan, middle=tilt).
        const entry0 = flightStateRef?.current?.get(icao24);
        if (entry0) {
          const dt0 = Date.now() - entry0.fetchedAt;
          const { lat: lat0, lon: lon0 } = deadReckon(entry0.lat, entry0.lon, entry0.heading, entry0.velocity, dt0);
          const planePos0 = Cartesian3.fromDegrees(lon0, lat0, FLIGHT_ALTITUDE);
          const hpr0 = new HeadingPitchRange(
            viewer.camera.heading,
            viewer.camera.pitch,
            Cartesian3.distance(viewer.camera.position, planePos0)
          );
          // Orient camera toward the plane, then immediately unlock so controls stay normal.
          viewer.camera.lookAt(planePos0, hpr0);
          viewer.camera.lookAtTransform(Matrix4.IDENTITY);

          followRef.current     = true;
          lastPlanePosRef.current = planePos0.clone();
        }

        // Every second: update live track endpoint and slide the camera by the
        // plane's ECEF displacement delta, keeping all normal controls intact.
        liveIntervalRef.current = setInterval(() => {
          const entry = flightStateRef?.current?.get(icao24);
          if (!entry) return;
          const dt = Date.now() - entry.fetchedAt;
          const { lat, lon } = deadReckon(entry.lat, entry.lon, entry.heading, entry.velocity, dt);
          const pos = Cartesian3.fromDegrees(lon, lat, FLIGHT_ALTITUDE);
          liveEndRef.current = pos;

          if (followRef.current && lastPlanePosRef.current) {
            // Translate the camera by the same vector the plane moved this tick.
            const delta = Cartesian3.subtract(pos, lastPlanePosRef.current, new Cartesian3());
            viewer.camera.position = Cartesian3.add(viewer.camera.position, delta, new Cartesian3());
          }
          lastPlanePosRef.current = pos.clone();
        }, 1000);

      } catch (e) {
        console.error('[selection] track error:', e);
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
      canvas.removeEventListener('mousedown', onMouseDown);
      if (selectionRef.current) {
        viewer.entities.remove(selectionRef.current.entity);
        selectionRef.current = null;
      }
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = null;
      }
      releaseFollow();
    };
  }, [viewer]);
}
