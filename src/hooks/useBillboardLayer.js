import { useEffect, useRef, useCallback } from 'react';
import { BillboardCollection, NearFarScalar } from 'cesium';
import { buildCallsignBillboard } from '../utils/callsignCanvas';
import { LABEL_VISIBLE, LABEL_ALWAYS } from '../providers/constants';
import { scheduleIdle } from '../utils/scheduleIdle';

const SCALE_BY_DIST        = new NearFarScalar(5e5, 1.5, 1.5e7, 0.4);
const TRANSLUCENCY_BY_DIST = new NearFarScalar(5e5, 1.0, 2e7,  0.5);

/**
 * Generic billboard layer hook.
 *
 * @param {object}   viewer       – Cesium viewer instance
 * @param {Map}      entitiesMap  – Map<id, entityData>
 * @param {Set}      visibleTypes – which _category values are visible
 * @param {object}   config
 * @param {function} config.createBillboard  – (billboards, id, data, typesRef) → { billboard, entry }
 * @param {function} config.updateEntry      – (entry, data, billboards, typesRef) → void
 * @param {function} config.getLabelInfo     – (entry) → { pos, height, label, country } | null
 * @param {object}   config.categoryColors   – { [category]: Color }
 * @param {Color}    config.selectedColor     – highlight color
 * @param {number}   config.batchSize         – billboards per RAF frame
 * @param {number}   config.labelBatchSize    – labels per idle slice
 */
export function useBillboardLayer(viewer, entitiesMap, visibleTypes, config) {
  const {
    createBillboard,
    updateEntry,
    getLabelInfo,
    categoryColors,
    selectedColor,
    batchSize = 20,
    labelBatchSize = 30,
  } = config;

  const billboardsRef    = useRef(null);
  const stateRef         = useRef(new Map());
  const selectedIdRef    = useRef(null);
  const entityQueueRef   = useRef([]);
  const labelQueueRef    = useRef([]);
  const entityRafRef     = useRef(null);
  const labelIdleRef     = useRef(null);
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

  // Sync entitiesMap → billboards
  useEffect(() => {
    const billboards = billboardsRef.current;
    if (!billboards) return;
    const state = stateRef.current;

    if (entityRafRef.current) {
      cancelAnimationFrame(entityRafRef.current);
      entityRafRef.current = null;
    }
    labelQueueRef.current = [];

    // Remove stale
    for (const [id, entry] of state) {
      if (!entitiesMap.has(id)) {
        billboards.remove(entry.billboard);
        if (entry.label) billboards.remove(entry.label);
        state.delete(id);
      }
    }

    // Update existing + enqueue new
    entityQueueRef.current = [];
    for (const [id, data] of entitiesMap) {
      if (state.has(id)) {
        updateEntry(state.get(id), data, billboards, typesRef);
      } else {
        entityQueueRef.current.push([id, data]);
      }
    }

    // Pass 1 — entity billboards (RAF)
    function processEntityBatch() {
      if (billboards.isDestroyed()) return;
      const batch = entityQueueRef.current.splice(0, batchSize);
      for (const [id, data] of batch) {
        const { billboard, entry } = createBillboard(billboards, id, data, typesRef);

        // Apply common billboard properties
        billboard.scaleByDistance        = billboard.scaleByDistance ?? SCALE_BY_DIST;
        billboard.translucencyByDistance = billboard.translucencyByDistance ?? TRANSLUCENCY_BY_DIST;

        state.set(id, entry);
        labelQueueRef.current.push(id);
      }

      if (entityQueueRef.current.length > 0) {
        entityRafRef.current = requestAnimationFrame(processEntityBatch);
      } else {
        entityRafRef.current = null;
        if (labelQueueRef.current.length > 0) {
          labelIdleRef.current = scheduleIdle(processLabelBatch);
        }
      }
    }

    // Pass 2 — labels (idle, expensive canvas ops)
    function processLabelBatch(deadline) {
      if (billboards.isDestroyed()) return;
      const queue = labelQueueRef.current;

      let processed = 0;
      while (queue.length > 0 && processed < labelBatchSize) {
        const hasTime = deadline?.timeRemaining ? deadline.timeRemaining() > 1 : true;
        if (!hasTime) break;

        const id    = queue.shift();
        const entry = state.get(id);
        if (!entry || entry.label) continue;

        const info = getLabelInfo(entry);
        if (info) {
          entry.label = buildCallsignBillboard(
            billboards, info.pos, info.height, info.label, info.country ?? null
          );
          entry.label.show = entry.billboard.show;
          if (selectedIdRef.current === id) {
            entry.label.scaleByDistance        = LABEL_ALWAYS;
            entry.label.translucencyByDistance = LABEL_ALWAYS;
          }
        }
        processed++;
      }

      if (queue.length > 0) {
        labelIdleRef.current = scheduleIdle(processLabelBatch);
      } else {
        labelIdleRef.current = null;
      }
    }

    if (entityQueueRef.current.length > 0) {
      entityRafRef.current = requestAnimationFrame(processEntityBatch);
    }
  }, [entitiesMap, viewer]);

  // Selection highlight
  const setSelected = useCallback((id) => {
    const state = stateRef.current;
    const prev  = selectedIdRef.current;

    if (prev) {
      const entry = state.get(prev);
      if (entry) {
        entry.billboard.color = categoryColors[entry._category] ?? categoryColors.unknown ?? categoryColors.leo;
        if (entry.label) {
          entry.label.scaleByDistance        = LABEL_VISIBLE();
          entry.label.translucencyByDistance = LABEL_VISIBLE();
        }
      }
    }

    selectedIdRef.current = id ?? null;

    if (id) {
      const entry = state.get(id);
      if (entry) {
        entry.billboard.color = selectedColor;
        if (entry.label) {
          entry.label.scaleByDistance        = LABEL_ALWAYS;
          entry.label.translucencyByDistance = LABEL_ALWAYS;
        }
      }
    }
  }, [categoryColors, selectedColor]);

  return { billboardsRef, stateRef, selectedIdRef, typesRef, setSelected };
}
