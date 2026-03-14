import { useEffect, useRef, useCallback } from 'react';
import {
  BillboardCollection,
  NearFarScalar,
  Cartesian3,
  Math as CesiumMath,
} from 'cesium';
import { getCategoryType, getCategoryFromTypeCode, getIconForTypeCode, CATEGORY_SIZE, FLIGHT_CATEGORY_COLOR } from '../providers/planeIcons';
import { lookupAircraft, preloadAircraftDb } from '../providers/aircraftDb';
import { buildCallsignBillboard } from '../utils/callsignCanvas';
import { useDeadReckoning } from './useDeadReckoning';
import {
  FLIGHT_ALTITUDE, LABEL_VISIBLE,
  SELECTED_PLANE_COLOR, PLANE_BATCH_SIZE, CALLSIGN_BATCH_SIZE,
} from '../providers/constants';

const LABEL_ALWAYS = new NearFarScalar(1, 1.0, 1e10, 1.0);

const scheduleIdle = typeof requestIdleCallback === 'function'
  ? (cb) => requestIdleCallback(cb, { timeout: 2000 })
  : (cb) => requestAnimationFrame(cb);

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFlightLayer(viewer, flightsMap, visibleTypes) {
  const billboardsRef      = useRef(null);
  const stateRef           = useRef(new Map());
  const selectedIcaoRef    = useRef(null);
  const planeQueueRef      = useRef([]);
  const callsignQueueRef   = useRef([]);
  const planeRafRef        = useRef(null);
  const callsignIdleRef    = useRef(null);
  const typesRef           = useRef(visibleTypes);
  typesRef.current         = visibleTypes;

  // Dead reckoning (extracted hook)
  useDeadReckoning(viewer, billboardsRef, stateRef);

  // Create / destroy billboard collection
  useEffect(() => {
    if (!viewer) return;
    const billboards = new BillboardCollection();
    viewer.scene.primitives.add(billboards);
    billboardsRef.current = billboards;
    return () => {
      if (!billboards.isDestroyed()) viewer.scene.primitives.remove(billboards);
      billboardsRef.current = null;
      stateRef.current.clear();
    };
  }, [viewer]);

  // Sync flightsMap → billboards
  useEffect(() => {
    const billboards = billboardsRef.current;
    if (!billboards) return;
    const state = stateRef.current;

    if (planeRafRef.current) { cancelAnimationFrame(planeRafRef.current); planeRafRef.current = null; }

    // Remove stale
    for (const [icao, entry] of state) {
      if (!flightsMap.has(icao)) {
        billboards.remove(entry.billboard);
        if (entry.callsign) billboards.remove(entry.callsign);
        state.delete(icao);
      }
    }

    // Update existing + enqueue new
    planeQueueRef.current = [];
    for (const [icao, flight] of flightsMap) {
      if (state.has(icao)) {
        const entry = state.get(icao);
        entry.lat       = flight.lat;
        entry.lon       = flight.lon;
        entry.heading   = flight.heading;
        entry.velocity  = flight.velocity;
        entry.fetchedAt = flight.fetchedAt;
        entry.billboard.rotation = -CesiumMath.toRadians(flight.heading);
      } else {
        planeQueueRef.current.push([icao, flight]);
      }
    }

    // Pass 1 — plane billboards (RAF, lightweight)
    function processPlaneBatch() {
      if (billboards.isDestroyed()) return;
      const batch = planeQueueRef.current.splice(0, PLANE_BATCH_SIZE);
      for (const [icao, flight] of batch) {
        const db        = lookupAircraft(icao);
        const typeCode  = db?.typeCode ?? null;
        const category  = getCategoryFromTypeCode(typeCode)
                       ?? getCategoryType(flight.category, flight.velocity, flight.altitude);
        const { w, h } = CATEGORY_SIZE[category] ?? CATEGORY_SIZE.unknown;
        const pos       = Cartesian3.fromDegrees(flight.lon, flight.lat, FLIGHT_ALTITUDE);

        const show = typesRef.current?.has(category) ?? true;
        const billboard = billboards.add({
          id: icao,
          position: pos,
          image: getIconForTypeCode(typeCode, category),
          width: w,
          height: h,
          show,
          rotation: -CesiumMath.toRadians(flight.heading),
          alignedAxis: Cartesian3.UNIT_Z,
          color: FLIGHT_CATEGORY_COLOR[category] ?? FLIGHT_CATEGORY_COLOR.unknown,
          scaleByDistance:        new NearFarScalar(5e5, 1.5, 1.5e7, 0.4),
          translucencyByDistance: new NearFarScalar(5e5, 1.0, 2e7,  0.5),
        });

        state.set(icao, {
          billboard,
          callsign:  null,
          lat:       flight.lat,
          lon:       flight.lon,
          heading:   flight.heading,
          velocity:  flight.velocity,
          fetchedAt: flight.fetchedAt,
          _h:        h,
          _label:    flight.callsign || flight.icao24,
          _country:  flight.country,
          _pos:      pos,
          _adsbCat:  flight.category,
          _alt:      flight.altitude,
          _category: category,
        });

        callsignQueueRef.current.push(icao);
      }

      if (planeQueueRef.current.length > 0) {
        planeRafRef.current = requestAnimationFrame(processPlaneBatch);
      } else {
        planeRafRef.current = null;
        if (callsignQueueRef.current.length > 0) {
          callsignIdleRef.current = scheduleIdle(processCallsignBatch);
        }
      }
    }

    // Pass 2 — callsign canvases (idle, expensive canvas ops)
    function processCallsignBatch(deadline) {
      if (billboards.isDestroyed()) return;
      const queue = callsignQueueRef.current;

      let processed = 0;
      while (queue.length > 0 && processed < CALLSIGN_BATCH_SIZE) {
        const hasTime = deadline?.timeRemaining ? deadline.timeRemaining() > 1 : true;
        if (!hasTime) break;

        const icao  = queue.shift();
        const entry = state.get(icao);
        if (!entry || entry.callsign) continue;

        entry.callsign = buildCallsignBillboard(
          billboards, entry._pos, entry._h, entry._label, entry._country
        );
        entry.callsign.show = entry.billboard.show;
        if (selectedIcaoRef.current === icao) {
          entry.callsign.scaleByDistance        = LABEL_ALWAYS;
          entry.callsign.translucencyByDistance = LABEL_ALWAYS;
        }
        processed++;
      }

      if (queue.length > 0) {
        callsignIdleRef.current = scheduleIdle(processCallsignBatch);
      } else {
        callsignIdleRef.current = null;
      }
    }

    if (planeQueueRef.current.length > 0) {
      planeRafRef.current = requestAnimationFrame(processPlaneBatch);
    }
  }, [flightsMap, viewer]);

  // Re-evaluate icons once aircraft DB finishes loading
  useEffect(() => {
    preloadAircraftDb().then(() => {
      const billboards = billboardsRef.current;
      if (!billboards || billboards.isDestroyed()) return;
      for (const [icao, entry] of stateRef.current) {
        const db       = lookupAircraft(icao);
        const typeCode = db?.typeCode ?? null;
        const category = getCategoryFromTypeCode(typeCode)
                      ?? getCategoryType(entry._adsbCat, entry.velocity, entry._alt);
        const { w, h } = CATEGORY_SIZE[category] ?? CATEGORY_SIZE.unknown;
        entry.billboard.image  = getIconForTypeCode(typeCode, category);
        entry.billboard.width  = w;
        entry.billboard.height = h;
        entry._h = h;
      }
    }).catch(() => { /* DB indisponível — mantém ícones atuais */ });
  }, [viewer]); // eslint-disable-line react-hooks/exhaustive-deps

  // Selection highlight
  const setSelected = useCallback((icao) => {
    const state = stateRef.current;
    const prev  = selectedIcaoRef.current;

    if (prev) {
      const entry = state.get(prev);
      if (entry?.callsign) {
        entry.billboard.color              = FLIGHT_CATEGORY_COLOR[entry._category] ?? FLIGHT_CATEGORY_COLOR.unknown;
        entry.callsign.scaleByDistance        = LABEL_VISIBLE();
        entry.callsign.translucencyByDistance = LABEL_VISIBLE();
      }
    }

    selectedIcaoRef.current = icao ?? null;

    if (icao) {
      const entry = state.get(icao);
      if (entry?.callsign) {
        entry.billboard.color              = SELECTED_PLANE_COLOR;
        entry.callsign.scaleByDistance        = LABEL_ALWAYS;
        entry.callsign.translucencyByDistance = LABEL_ALWAYS;
      }
    }
  }, []);

  return { stateRef, setSelected };
}
