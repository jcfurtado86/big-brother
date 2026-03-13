import { useEffect, useRef, useCallback } from 'react';
import {
  BillboardCollection,
  Color,
  Cartesian2,
  NearFarScalar,
  Cartesian3,
  Math as CesiumMath,
} from 'cesium';
import { getCategoryType, getPlaneImage, CATEGORY_SIZE } from '../providers/planeIcons';
import { getFlagImg } from '../providers/countryFlags';
import { deadReckon } from '../utils/geoMath';

const DEAD_RECKONING_INTERVAL = Number(import.meta.env.VITE_DEAD_RECKONING_MS  ?? 1000);
const FLIGHT_ALTITUDE = Number(import.meta.env.VITE_FLIGHT_ALTITUDE_M ?? 10000);
const LABEL_NEAR      = Number(import.meta.env.VITE_LABEL_NEAR_M      ?? 2e6);
const LABEL_FAR       = Number(import.meta.env.VITE_LABEL_FAR_M       ?? 3e6);
const LABEL_ALWAYS   = new NearFarScalar(1, 1.0, 1e10, 1.0);
const LABEL_VISIBLE  = () => new NearFarScalar(LABEL_NEAR, 1.0, LABEL_FAR, 0.0);
const PLANE_COLOR          = Color.fromCssColorString(import.meta.env.VITE_PLANE_COLOR          || '#F2A800');
const SELECTED_PLANE_COLOR = Color.fromCssColorString(import.meta.env.VITE_SELECTED_PLANE_COLOR || '#FF0000');

// ── Callsign + flag canvas ────────────────────────────────────────────────────

const FONT_SIZE = 14;
const FLAG_W = 34, FLAG_H = 23;
const GAP = 5, PAD_X = 5, PAD_Y = 4;

// Reusable context for text measurement — avoids creating a canvas per flight
const _measureCtx = document.createElement('canvas').getContext('2d');

function measureCallsignCanvas(callsign, hasFlag) {
  _measureCtx.font = `${FONT_SIZE}px monospace`;
  const textW = Math.ceil(_measureCtx.measureText(callsign).width);
  const H = hasFlag ? FLAG_H : PAD_Y + FONT_SIZE + 4 + PAD_Y;
  const W = (hasFlag ? FLAG_W + GAP : PAD_X) + textW + PAD_X;
  return { W, H };
}

function drawCallsignCanvas(ctx, W, H, callsign, hasFlag, flagImg) {
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(0, 0, W, H, hasFlag ? [0, 3, 3, 0] : 3);
  else ctx.rect(0, 0, W, H);
  ctx.fill();

  let x = 0;
  if (hasFlag && flagImg) {
    ctx.drawImage(flagImg, 0, 0, FLAG_W, FLAG_H);
    x = FLAG_W + GAP;
  } else {
    x = PAD_X;
  }

  ctx.font = `${FONT_SIZE}px monospace`;
  ctx.fillStyle = 'white';
  ctx.textBaseline = 'middle';
  ctx.fillText(callsign, x, H / 2);
}

function buildCallsignBillboard(billboards, pos, h, callsign, flagImg) {
  const hasFlag = !!flagImg;
  const { W, H } = measureCallsignCanvas(callsign, hasFlag);

  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  drawCallsignCanvas(c.getContext('2d'), W, H, callsign, hasFlag, flagImg);

  const labelY = h / 2 + H / 2 + 6;
  return billboards.add({
    position: pos,
    image:  c,
    width:  W,
    height: H,
    pixelOffset:            new Cartesian2(0, labelY),
    scaleByDistance:        LABEL_VISIBLE(),
    translucencyByDistance: LABEL_VISIBLE(),
  });
}

// requestIdleCallback with RAF fallback
const scheduleIdle = typeof requestIdleCallback === 'function'
  ? (cb) => requestIdleCallback(cb, { timeout: 2000 })
  : (cb) => requestAnimationFrame(cb);

// ── Hook ──────────────────────────────────────────────────────────────────────

const PLANE_BATCH_SIZE    = Number(import.meta.env.VITE_PLANE_BATCH_SIZE    ?? 20);
const CALLSIGN_BATCH_SIZE = Number(import.meta.env.VITE_CALLSIGN_BATCH_SIZE ?? 30);

export function useFlightLayer(viewer, flightsMap) {
  const billboardsRef      = useRef(null);
  const stateRef           = useRef(new Map());
  const selectedIcaoRef    = useRef(null);
  const planeQueueRef      = useRef([]);  // pending plane billboards
  const callsignQueueRef   = useRef([]);  // pending callsign canvases
  const planeRafRef        = useRef(null);
  const callsignIdleRef    = useRef(null);

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

    // Cancel pending plane batch from previous update
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
        const type     = getCategoryType(flight.category, flight.velocity, flight.altitude);
        const { w, h } = CATEGORY_SIZE[type];
        const pos      = Cartesian3.fromDegrees(flight.lon, flight.lat, FLIGHT_ALTITUDE);

        const billboard = billboards.add({
          id: icao,
          position: pos,
          image: getPlaneImage(type),
          width: w,
          height: h,
          rotation: -CesiumMath.toRadians(flight.heading),
          alignedAxis: Cartesian3.UNIT_Z,
          color: PLANE_COLOR,
          scaleByDistance:        new NearFarScalar(5e5, 1.5, 1.5e7, 0.4),
          translucencyByDistance: new NearFarScalar(5e5, 1.0, 2e7,  0.5),
        });

        state.set(icao, {
          billboard,
          callsign:  null, // filled in pass 2
          lat:       flight.lat,
          lon:       flight.lon,
          heading:   flight.heading,
          velocity:  flight.velocity,
          fetchedAt: flight.fetchedAt,
          _h:        h,
          _label:    flight.callsign || flight.icao24,
          _country:  flight.country,
          _pos:      pos,
        });

        // Enqueue callsign for idle pass
        callsignQueueRef.current.push(icao);
      }

      if (planeQueueRef.current.length > 0) {
        planeRafRef.current = requestAnimationFrame(processPlaneBatch);
      } else {
        planeRafRef.current = null;
        // Start callsign pass once all planes are added
        if (callsignQueueRef.current.length > 0) {
          callsignIdleRef.current = scheduleIdle(processCallsignBatch);
        }
      }
    }

    // Pass 2 — callsign canvases (idle, expensive canvas ops)
    function processCallsignBatch(deadline) {
      if (billboards.isDestroyed()) return;
      const queue = callsignQueueRef.current;

      // Process as many as possible within the idle slice (or fixed batch if no deadline API)
      let processed = 0;
      while (queue.length > 0 && processed < CALLSIGN_BATCH_SIZE) {
        const hasTime = deadline?.timeRemaining ? deadline.timeRemaining() > 1 : true;
        if (!hasTime) break;

        const icao  = queue.shift();
        const entry = state.get(icao);
        if (!entry || entry.callsign) continue; // removed or already has callsign

        entry.callsign = buildCallsignBillboard(
          billboards, entry._pos, entry._h, entry._label, getFlagImg(entry._country)
        );
        // Apply selection style if this flight is currently selected
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

  // Dead reckoning
  useEffect(() => {
    if (!viewer) return;
    const id = setInterval(() => {
      const billboards = billboardsRef.current;
      if (!billboards || billboards.isDestroyed()) return;
      const now = Date.now();
      for (const [, entry] of stateRef.current) {
        const dt = now - entry.fetchedAt;
        const { lat, lon } = deadReckon(entry.lat, entry.lon, entry.heading, entry.velocity, dt);
        const pos = Cartesian3.fromDegrees(lon, lat, FLIGHT_ALTITUDE);
        entry.billboard.position = pos;
        if (entry.callsign) entry.callsign.position = pos;
      }
    }, DEAD_RECKONING_INTERVAL);
    return () => clearInterval(id);
  }, [viewer]);

  // Selection highlight
  const setSelected = useCallback((icao) => {
    const state = stateRef.current;
    const prev  = selectedIcaoRef.current;

    if (prev) {
      const entry = state.get(prev);
      if (entry?.callsign) {
        entry.billboard.color              = PLANE_COLOR;
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
