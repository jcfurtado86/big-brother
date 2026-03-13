import { useEffect, useRef } from 'react';
import {
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Cartesian3,
  Color,
  ColorMaterialProperty,
  CallbackProperty,
  defined,
  Math as CesiumMath,
} from 'cesium';
import { openskyHeaders } from '../providers/openskyAuth';

const FLIGHT_ALTITUDE = Number(import.meta.env.VITE_FLIGHT_ALTITUDE_M ?? 10000);
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

  useEffect(() => {
    if (!viewer) return;

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction(async (click) => {
      const picked = viewer.scene.pick(click.position);
      viewer.selectedEntity = undefined;
      const icao24 = (defined(picked) && typeof picked.id === 'string') ? picked.id : null;

      const isSame = selectionRef.current?.icao24 === icao24;

      // Cancel any in-flight fetch, clear current track and live interval
      const token = ++pendingRef.current;
      if (selectionRef.current) {
        viewer.entities.remove(selectionRef.current.entity);
        selectionRef.current = null;
      }
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = null;
      }

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
            material: new ColorMaterialProperty(Color.fromCssColorString('#A020F0').withAlpha(0.9)),
            clampToGround: false,
            arcType: 0,
          },
        });

        selectionRef.current = { entity, icao24 };

        // Update the live endpoint every second using dead reckoning
        liveIntervalRef.current = setInterval(() => {
          const entry = flightStateRef?.current?.get(icao24);
          if (!entry) return;
          const dt = Date.now() - entry.fetchedAt;
          const { lat, lon } = deadReckon(entry.lat, entry.lon, entry.heading, entry.velocity, dt);
          liveEndRef.current = Cartesian3.fromDegrees(lon, lat, FLIGHT_ALTITUDE);
        }, 1000);

      } catch (e) {
        console.error('[selection] track error:', e);
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
      if (selectionRef.current) {
        viewer.entities.remove(selectionRef.current.entity);
        selectionRef.current = null;
      }
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = null;
      }
    };
  }, [viewer]);
}
