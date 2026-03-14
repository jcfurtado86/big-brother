import { useEffect, useRef, useCallback } from 'react';
import {
  BillboardCollection,
  NearFarScalar,
  Cartesian3,
} from 'cesium';
import { getSatelliteIcon, getSatelliteCategory, SATELLITE_CATEGORY_COLOR } from '../providers/satelliteIcons';
import { buildCallsignBillboard } from '../utils/callsignCanvas';
import { propagateSat } from '../providers/satelliteService';
import {
  SELECTED_SATELLITE_COLOR,
  SATELLITE_BATCH_SIZE, SATELLITE_LABEL_BATCH,
  LABEL_VISIBLE, LABEL_ALWAYS,
  TICK_INTERVAL_MS,
} from '../providers/constants';
import { scheduleIdle } from '../utils/scheduleIdle';

const SAT_SIZE = 24;

export function useSatelliteLayer(viewer, satellitesMap, visibleTypes) {
  const billboardsRef    = useRef(null);
  const stateRef         = useRef(new Map());
  const selectedIdRef    = useRef(null);
  const satQueueRef      = useRef([]);
  const labelQueueRef    = useRef([]);
  const satRafRef        = useRef(null);
  const labelIdleRef     = useRef(null);
  const propagateRef     = useRef(null);
  const typesRef         = useRef(visibleTypes);
  typesRef.current       = visibleTypes;

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

  // Real-time position propagation
  useEffect(() => {
    if (!viewer) return;
    function tick() {
      const now = new Date();
      for (const [, entry] of stateRef.current) {
        const typeVisible = typesRef.current?.has(entry._category) ?? true;
        if (!typeVisible) continue; // skip filtered-out categories
        const pos = propagateSat(entry.tle, now);
        if (!pos) continue;
        const cart = Cartesian3.fromDegrees(pos.lon, pos.lat, pos.alt * 1000);
        entry.billboard.position = cart;
        if (entry.label) entry.label.position = cart;
        entry.lat = pos.lat;
        entry.lon = pos.lon;
        entry.alt = pos.alt;
        entry.velocity = pos.velocity;
        entry._category = getSatelliteCategory(pos.alt);
        if (selectedIdRef.current !== entry.tle.noradId) {
          entry.billboard.color = SATELLITE_CATEGORY_COLOR[entry._category];
        }
      }
    }
    tick();
    propagateRef.current = setInterval(tick, TICK_INTERVAL_MS);
    return () => { clearInterval(propagateRef.current); };
  }, [viewer]);

  // Sync satellitesMap → billboards (batched)
  useEffect(() => {
    const billboards = billboardsRef.current;
    if (!billboards) return;
    const state = stateRef.current;

    if (satRafRef.current) { cancelAnimationFrame(satRafRef.current); satRafRef.current = null; }

    // Remove stale
    for (const [id, entry] of state) {
      if (!satellitesMap.has(id)) {
        billboards.remove(entry.billboard);
        if (entry.label) billboards.remove(entry.label);
        state.delete(id);
      }
    }

    // Update existing + enqueue new
    satQueueRef.current = [];
    for (const [id, tle] of satellitesMap) {
      if (state.has(id)) {
        state.get(id).tle = tle;
      } else {
        satQueueRef.current.push([id, tle]);
      }
    }

    function processSatBatch() {
      if (billboards.isDestroyed()) return;
      const batch = satQueueRef.current.splice(0, SATELLITE_BATCH_SIZE);
      const now = new Date();

      for (const [id, tle] of batch) {
        const pos = propagateSat(tle, now);
        const lat = pos?.lat ?? 0;
        const lon = pos?.lon ?? 0;
        const alt = pos?.alt ?? 400;
        const cart = Cartesian3.fromDegrees(lon, lat, alt * 1000);
        const category = getSatelliteCategory(alt);

        const show = typesRef.current?.has(category) ?? true;
        const billboard = billboards.add({
          id: `sat_${id}`,
          position: cart,
          image: getSatelliteIcon(),
          width: SAT_SIZE,
          height: SAT_SIZE,
          show,
          color: SATELLITE_CATEGORY_COLOR[category],
          scaleByDistance:        new NearFarScalar(5e5, 1.5, 1.5e7, 0.4),
          translucencyByDistance: new NearFarScalar(5e5, 1.0, 2e7,  0.5),
        });

        state.set(id, {
          billboard,
          label:     null,
          tle,
          lat, lon, alt,
          _h:        SAT_SIZE,
          _name:     tle.name,
          _category: category,
        });

        labelQueueRef.current.push(id);
      }

      if (satQueueRef.current.length > 0) {
        satRafRef.current = requestAnimationFrame(processSatBatch);
      } else {
        satRafRef.current = null;
        if (labelQueueRef.current.length > 0) {
          labelIdleRef.current = scheduleIdle(processLabelBatch);
        }
      }
    }

    function processLabelBatch(deadline) {
      if (billboards.isDestroyed()) return;
      const queue = labelQueueRef.current;
      let processed = 0;
      while (queue.length > 0 && processed < SATELLITE_LABEL_BATCH) {
        const hasTime = deadline?.timeRemaining ? deadline.timeRemaining() > 1 : true;
        if (!hasTime) break;
        const id = queue.shift();
        const entry = state.get(id);
        if (!entry || entry.label) continue;
        entry.label = buildCallsignBillboard(
          billboards, entry.billboard.position, entry._h, entry._name, null
        );
        entry.label.show = entry.billboard.show;
        if (selectedIdRef.current === id) {
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

    if (satQueueRef.current.length > 0) {
      satRafRef.current = requestAnimationFrame(processSatBatch);
    }
  }, [satellitesMap, viewer]);

  // Selection highlight
  const setSelected = useCallback((noradId) => {
    const state = stateRef.current;
    const prev = selectedIdRef.current;

    if (prev) {
      const entry = state.get(prev);
      if (entry) {
        entry.billboard.color = SATELLITE_CATEGORY_COLOR[entry._category] ?? SATELLITE_CATEGORY_COLOR.leo;
        if (entry.label) {
          entry.label.scaleByDistance        = LABEL_VISIBLE();
          entry.label.translucencyByDistance = LABEL_VISIBLE();
        }
      }
    }

    selectedIdRef.current = noradId ?? null;

    if (noradId) {
      const entry = state.get(noradId);
      if (entry) {
        entry.billboard.color = SELECTED_SATELLITE_COLOR;
        if (entry.label) {
          entry.label.scaleByDistance        = LABEL_ALWAYS;
          entry.label.translucencyByDistance = LABEL_ALWAYS;
        }
      }
    }
  }, []);

  return { stateRef, setSelected };
}
