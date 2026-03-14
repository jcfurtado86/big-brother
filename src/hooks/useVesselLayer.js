import { useEffect, useRef, useCallback } from 'react';
import {
  BillboardCollection,
  NearFarScalar,
  Cartesian3,
  Math as CesiumMath,
} from 'cesium';
import { getVesselCategory, getVesselIcon, VESSEL_CATEGORY_COLOR } from '../providers/vesselIcons';
import { buildCallsignBillboard } from '../utils/callsignCanvas';
import {
  SELECTED_VESSEL_COLOR,
  VESSEL_BATCH_SIZE, VESSEL_LABEL_BATCH,
  LABEL_VISIBLE, LABEL_ALWAYS,
} from '../providers/constants';
import { scheduleIdle } from '../utils/scheduleIdle';

// Tamanho do ícone proporcional ao comprimento real do navio
const MIN_LEN = 10, MAX_LEN = 400;
const MIN_PX  = 28, MAX_PX  = 56;
function vesselSize(length) {
  const l = Math.max(MIN_LEN, Math.min(MAX_LEN, length || MIN_LEN));
  const s = MIN_PX + (MAX_PX - MIN_PX) * (l - MIN_LEN) / (MAX_LEN - MIN_LEN);
  return Math.round(s);
}

export function useVesselLayer(viewer, vesselsMap, visibleTypes) {
  const billboardsRef      = useRef(null);
  const stateRef           = useRef(new Map());
  const selectedMmsiRef    = useRef(null);
  const vesselQueueRef     = useRef([]);
  const labelQueueRef      = useRef([]);
  const vesselRafRef       = useRef(null);
  const labelIdleRef       = useRef(null);
  const typesRef           = useRef(visibleTypes);
  typesRef.current         = visibleTypes;

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

  // Sync vesselsMap → billboards (batched)
  useEffect(() => {
    const billboards = billboardsRef.current;
    if (!billboards) return;
    const state = stateRef.current;

    if (vesselRafRef.current) { cancelAnimationFrame(vesselRafRef.current); vesselRafRef.current = null; }

    // Remove stale
    for (const [mmsi, entry] of state) {
      if (!vesselsMap.has(mmsi)) {
        billboards.remove(entry.billboard);
        if (entry.label) billboards.remove(entry.label);
        state.delete(mmsi);
      }
    }

    // Update existing + enqueue new
    vesselQueueRef.current = [];
    for (const [mmsi, vessel] of vesselsMap) {
      if (state.has(mmsi)) {
        const entry = state.get(mmsi);
        const pos = Cartesian3.fromDegrees(vessel.lon, vessel.lat, 0);
        entry.billboard.position = pos;
        entry.billboard.rotation = -CesiumMath.toRadians(vessel.heading);
        if (entry.label) entry.label.position = pos;
        entry.vessel = vessel;
        entry.lat = vessel.lat;
        entry.lon = vessel.lon;
      } else {
        vesselQueueRef.current.push([mmsi, vessel]);
      }
    }

    // Pass 1 — vessel billboards (RAF, lightweight)
    function processVesselBatch() {
      if (billboards.isDestroyed()) return;
      const batch = vesselQueueRef.current.splice(0, VESSEL_BATCH_SIZE);
      for (const [mmsi, vessel] of batch) {
        const category = getVesselCategory(vessel.shipType);
        const sz = vesselSize(vessel.length);
        const pos = Cartesian3.fromDegrees(vessel.lon, vessel.lat, 0);

        const show = typesRef.current?.has(category) ?? true;
        const billboard = billboards.add({
          id: `vessel_${mmsi}`,
          position: pos,
          image: getVesselIcon(),
          width: sz,
          height: sz,
          show,
          rotation: -CesiumMath.toRadians(vessel.heading),
          alignedAxis: Cartesian3.UNIT_Z,
          color: VESSEL_CATEGORY_COLOR[category],
          scaleByDistance:        new NearFarScalar(5e5, 1.5, 1.5e7, 0.4),
          translucencyByDistance: new NearFarScalar(5e5, 1.0, 2e7,  0.5),
        });

        state.set(mmsi, {
          billboard,
          label:   null,
          vessel,
          lat:     vessel.lat,
          lon:     vessel.lon,
          _h:      sz,
          _name:   vessel.name || mmsi,
          _country: vessel.country,
          _pos:    pos,
          _category: category,
        });

        labelQueueRef.current.push(mmsi);
      }

      if (vesselQueueRef.current.length > 0) {
        vesselRafRef.current = requestAnimationFrame(processVesselBatch);
      } else {
        vesselRafRef.current = null;
        if (labelQueueRef.current.length > 0) {
          labelIdleRef.current = scheduleIdle(processLabelBatch);
        }
      }
    }

    // Pass 2 — name labels (idle, expensive canvas ops)
    function processLabelBatch(deadline) {
      if (billboards.isDestroyed()) return;
      const queue = labelQueueRef.current;

      let processed = 0;
      while (queue.length > 0 && processed < VESSEL_LABEL_BATCH) {
        const hasTime = deadline?.timeRemaining ? deadline.timeRemaining() > 1 : true;
        if (!hasTime) break;

        const mmsi = queue.shift();
        const entry = state.get(mmsi);
        if (!entry || entry.label) continue;

        entry.label = buildCallsignBillboard(
          billboards, entry._pos, entry._h, entry._name, entry._country
        );
        entry.label.show = entry.billboard.show;
        if (selectedMmsiRef.current === mmsi) {
          entry.label.scaleByDistance        = LABEL_ALWAYS;
          entry.label.translucencyByDistance = LABEL_ALWAYS;
        }
        processed++;
      }

      if (queue.length > 0) {
        labelIdleRef.current = scheduleIdle(processLabelBatch);
      } else {
        labelIdleRef.current = null;
      }
    }

    if (vesselQueueRef.current.length > 0) {
      vesselRafRef.current = requestAnimationFrame(processVesselBatch);
    }
  }, [vesselsMap, viewer]);

  // Selection highlight
  const setSelected = useCallback((mmsi) => {
    const state = stateRef.current;
    const prev  = selectedMmsiRef.current;

    if (prev) {
      const entry = state.get(prev);
      if (entry) {
        entry.billboard.color = VESSEL_CATEGORY_COLOR[entry._category] ?? VESSEL_CATEGORY_COLOR.unknown;
        if (entry.label) {
          entry.label.scaleByDistance        = LABEL_VISIBLE();
          entry.label.translucencyByDistance = LABEL_VISIBLE();
        }
      }
    }

    selectedMmsiRef.current = mmsi ?? null;

    if (mmsi) {
      const entry = state.get(mmsi);
      if (entry) {
        entry.billboard.color = SELECTED_VESSEL_COLOR;
        if (entry.label) {
          entry.label.scaleByDistance        = LABEL_ALWAYS;
          entry.label.translucencyByDistance = LABEL_ALWAYS;
        }
      }
    }
  }, []);

  return { stateRef, setSelected };
}
