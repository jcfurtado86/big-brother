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
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );
  const λ2 = λ1 + Math.atan2(
    Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
    Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
  );
  return { lat: CesiumMath.toDegrees(φ2), lon: CesiumMath.toDegrees(λ2) };
}

// ── Callsign + flag canvas ────────────────────────────────────────────────────

const FONT_SIZE = 14;
const FLAG_W = 34, FLAG_H = 23;
const GAP = 5, PAD_X = 5, PAD_Y = 4;

function measureCallsignCanvas(callsign, hasFlag) {
  const tmp = document.createElement('canvas').getContext('2d');
  tmp.font = `${FONT_SIZE}px monospace`;
  const textW = Math.ceil(tmp.measureText(callsign).width);
  // Height is always FLAG_H when flag is present (flag fills edge-to-edge vertically),
  // otherwise text height + vertical padding.
  const H = hasFlag ? FLAG_H : PAD_Y + FONT_SIZE + 4 + PAD_Y;
  // Flag starts at x=0 (no left pad); text gets right pad only.
  const W = (hasFlag ? FLAG_W + GAP : PAD_X) + textW + PAD_X;
  return { W, H };
}

function drawCallsignCanvas(ctx, W, H, callsign, hasFlag, flagImg) {
  ctx.clearRect(0, 0, W, H);

  // Background — rounded only on the right side when flag is present
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

// Draw canvas once — flagImg is a pre-loaded HTMLImageElement or null.
// Never updates bb.image after creation to avoid Cesium TextureAtlas overflow.
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
    scaleByDistance:        new NearFarScalar(LABEL_NEAR, 1.0, LABEL_FAR, 0.0),
    translucencyByDistance: new NearFarScalar(LABEL_NEAR, 1.0, LABEL_FAR, 0.0),
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFlightLayer(viewer, flightsMap) {
  const billboardsRef   = useRef(null);
  const stateRef        = useRef(new Map());
  const selectedIcaoRef = useRef(null);

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

    // Remove stale
    for (const [icao, entry] of state) {
      if (!flightsMap.has(icao)) {
        billboards.remove(entry.billboard);
        billboards.remove(entry.callsign);
        state.delete(icao);
      }
    }

    // Add / update
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
          alignedAxis: Cartesian3.UNIT_Z,
          color: PLANE_COLOR,
          scaleByDistance:        new NearFarScalar(5e5, 1.5, 1.5e7, 0.4),
          translucencyByDistance: new NearFarScalar(5e5, 1.0, 2e7,  0.5),
        });

        const callsignBb = buildCallsignBillboard(
          billboards, pos, h, callsign, getFlagImg(flight.country)
        );

        state.set(icao, {
          billboard,
          callsign: callsignBb,
          lat:      flight.lat,
          lon:      flight.lon,
          heading:  flight.heading,
          velocity: flight.velocity,
          fetchedAt: flight.fetchedAt,
        });
      }
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
        entry.callsign.position  = pos;
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
      if (entry) {
        entry.billboard.color              = PLANE_COLOR;
        entry.callsign.scaleByDistance        = new NearFarScalar(LABEL_NEAR, 1.0, LABEL_FAR, 0.0);
        entry.callsign.translucencyByDistance = new NearFarScalar(LABEL_NEAR, 1.0, LABEL_FAR, 0.0);
      }
    }

    selectedIcaoRef.current = icao ?? null;

    if (icao) {
      const entry = state.get(icao);
      if (entry) {
        entry.billboard.color              = SELECTED_PLANE_COLOR;
        entry.callsign.scaleByDistance        = LABEL_ALWAYS;
        entry.callsign.translucencyByDistance = LABEL_ALWAYS;
      }
    }
  }, []);

  return { stateRef, setSelected };
}
