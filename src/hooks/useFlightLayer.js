import { useEffect, useRef, useCallback } from 'react';
import {
  BillboardCollection,
  LabelCollection,
  LabelStyle,
  Color,
  Cartesian2,
  NearFarScalar,
  Cartesian3,
  Math as CesiumMath,
} from 'cesium';
import { getCategoryType, getPlaneImage, CATEGORY_SIZE } from '../providers/planeIcons';

const DEAD_RECKONING_INTERVAL = Number(import.meta.env.VITE_DEAD_RECKONING_MS  ?? 1000);
const R = 6371000;
const FLIGHT_ALTITUDE = Number(import.meta.env.VITE_FLIGHT_ALTITUDE_M ?? 10000);
const LABEL_NEAR      = Number(import.meta.env.VITE_LABEL_NEAR_M      ?? 2e6);
const LABEL_FAR       = Number(import.meta.env.VITE_LABEL_FAR_M       ?? 3e6);
const LABEL_ALWAYS         = new NearFarScalar(1, 1.0, 1e10, 1.0);
const PLANE_COLOR          = Color.fromCssColorString(import.meta.env.VITE_PLANE_COLOR          || '#F2A800');
const SELECTED_PLANE_COLOR = Color.fromCssColorString(import.meta.env.VITE_SELECTED_PLANE_COLOR || '#FF0000');

function deadReckon(lat, lon, heading, velocity, dtMs) {
  const dt = dtMs / 1000;
  const d = velocity * dt;
  if (d === 0) return { lat, lon };

  const φ1 = CesiumMath.toRadians(lat);
  const λ1 = CesiumMath.toRadians(lon);
  const θ = CesiumMath.toRadians(heading);
  const δ = d / R;

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) +
    Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    );

  return {
    lat: CesiumMath.toDegrees(φ2),
    lon: CesiumMath.toDegrees(λ2),
  };
}

export function useFlightLayer(viewer, flightsMap) {
  const billboardsRef   = useRef(null);
  const labelsRef       = useRef(null);
  const stateRef        = useRef(new Map());
  const selectedIcaoRef = useRef(null);

  // Create / destroy primitive collections
  useEffect(() => {
    if (!viewer) return;

    const billboards = new BillboardCollection();
    const labels     = new LabelCollection();
    viewer.scene.primitives.add(billboards);
    viewer.scene.primitives.add(labels);
    billboardsRef.current = billboards;
    labelsRef.current     = labels;

    return () => {
      if (!billboards.isDestroyed()) viewer.scene.primitives.remove(billboards);
      if (!labels.isDestroyed())     viewer.scene.primitives.remove(labels);
      billboardsRef.current = null;
      labelsRef.current     = null;
      stateRef.current.clear();
    };
  }, [viewer]);

  // Sync flightsMap → billboards + labels
  useEffect(() => {
    const billboards = billboardsRef.current;
    const labels     = labelsRef.current;
    if (!billboards || !labels) return;

    const state = stateRef.current;

    // Remove stale entries
    for (const [icao, entry] of state) {
      if (!flightsMap.has(icao)) {
        billboards.remove(entry.billboard);
        labels.remove(entry.label);
        state.delete(icao);
      }
    }

    // Add / update
    for (const [icao, flight] of flightsMap) {
      if (state.has(icao)) {
        const entry = state.get(icao);
        entry.lat      = flight.lat;
        entry.lon      = flight.lon;
        entry.heading  = flight.heading;
        entry.velocity = flight.velocity;
        entry.fetchedAt = flight.fetchedAt;
        entry.billboard.rotation = -CesiumMath.toRadians(flight.heading);
      } else {
        const type     = getCategoryType(flight.category, flight.velocity, flight.altitude);
        const { w, h } = CATEGORY_SIZE[type];
        const pos      = Cartesian3.fromDegrees(flight.lon, flight.lat, FLIGHT_ALTITUDE);
        const callsign = flight.callsign || flight.icao24;

        const billboard = billboards.add({
          id: icao,
          position: pos,
          image: getPlaneImage(type),
          width: w,
          height: h,
          rotation: -CesiumMath.toRadians(flight.heading),
          alignedAxis: Cartesian3.UNIT_Z, // anchor rotation to world north, not screen up
          color: PLANE_COLOR,
          scaleByDistance:       new NearFarScalar(5e5, 1.5, 1.5e7, 0.4),
          translucencyByDistance: new NearFarScalar(5e5, 1.0, 2e7,  0.5),
        });

        const label = labels.add({
          position: pos,
          text: callsign,
          font: '17px monospace',
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK,
          outlineWidth: 2,
          style: LabelStyle.FILL_AND_OUTLINE,
          showBackground: true,
          backgroundColor: new Color(0, 0, 0, 0.5),
          backgroundPadding: new Cartesian2(5, 3),
          pixelOffset: new Cartesian2(0, -(h / 2 + 8)),
          scaleByDistance:        new NearFarScalar(LABEL_NEAR, 1.0, LABEL_FAR, 0.0),
          translucencyByDistance: new NearFarScalar(LABEL_NEAR, 1.0, LABEL_FAR, 0.0),
        });

        state.set(icao, {
          billboard,
          label,
          lat:      flight.lat,
          lon:      flight.lon,
          heading:  flight.heading,
          velocity: flight.velocity,
          fetchedAt: flight.fetchedAt,
        });
      }
    }
  }, [flightsMap, viewer]);

  // Dead reckoning — update positions every second
  useEffect(() => {
    if (!viewer) return;

    const id = setInterval(() => {
      const billboards = billboardsRef.current;
      const labels     = labelsRef.current;
      if (!billboards || billboards.isDestroyed()) return;

      const now = Date.now();
      for (const [, entry] of stateRef.current) {
        const dt  = now - entry.fetchedAt;
        const { lat, lon } = deadReckon(entry.lat, entry.lon, entry.heading, entry.velocity, dt);
        const pos = Cartesian3.fromDegrees(lon, lat, FLIGHT_ALTITUDE);
        entry.billboard.position = pos;
        entry.label.position     = pos;
      }
    }, DEAD_RECKONING_INTERVAL);

    return () => clearInterval(id);
  }, [viewer]);

  // Called by useFlightSelection to apply / clear the selection highlight
  const setSelected = useCallback((icao) => {
    const state = stateRef.current;
    const prev  = selectedIcaoRef.current;

    if (prev) {
      const entry = state.get(prev);
      if (entry) {
        entry.billboard.color              = PLANE_COLOR;
        entry.label.scaleByDistance        = new NearFarScalar(LABEL_NEAR, 1.0, LABEL_FAR, 0.0);
        entry.label.translucencyByDistance = new NearFarScalar(LABEL_NEAR, 1.0, LABEL_FAR, 0.0);
      }
    }

    selectedIcaoRef.current = icao ?? null;

    if (icao) {
      const entry = state.get(icao);
      if (entry) {
        entry.billboard.color              = SELECTED_PLANE_COLOR;
        entry.label.scaleByDistance        = LABEL_ALWAYS;
        entry.label.translucencyByDistance = LABEL_ALWAYS;
      }
    }
  }, []);

  return { stateRef, setSelected };
}
