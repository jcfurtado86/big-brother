import { useEffect, useRef, useCallback } from 'react';
import { BillboardCollection, NearFarScalar } from 'cesium';
import { buildCallsignBillboard } from '../utils/callsignCanvas';
import { LABEL_VISIBLE, LABEL_ALWAYS } from '../providers/constants';
import { getSetting } from '../providers/settingsStore';
import { scheduleIdle, cancelIdle } from '../utils/scheduleIdle';
import { useLoading } from '../contexts/LoadingContext';

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
    labelScaleByDistance,
    labelTranslucencyByDistance,
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
  const { start: loadStart, done: loadDone } = useLoading();

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

    // Cancel any in-progress rendering and balance the loading counter
    if (entityRafRef.current) {
      cancelAnimationFrame(entityRafRef.current);
      entityRafRef.current = null;
    }
    if (labelIdleRef.current != null) {
      cancelIdle(labelIdleRef.current);
      labelIdleRef.current = null;
    }
    labelQueueRef.current = [];
    loadDone();

    // Remove stale
    let removed = 0;
    for (const [id, entry] of state) {
      if (!entitiesMap.has(id)) {
        billboards.remove(entry.billboard);
        if (entry.label) billboards.remove(entry.label);
        state.delete(id);
        removed++;
      }
    }

    // Removed stale entries — need a render even if nothing new is added
    if (viewer) viewer.scene.requestRender();

    // Update existing + enqueue new
    entityQueueRef.current = [];
    let updated = 0;
    for (const [id, data] of entitiesMap) {
      if (state.has(id)) {
        updateEntry(state.get(id), data, billboards, typesRef);
        updated++;
        // Re-queue label if it was cancelled before being created
        const entry = state.get(id);
        if (!entry.label) labelQueueRef.current.push(id);
      } else {
        entityQueueRef.current.push([id, data]);
      }
    }

    if (removed > 0 || entityQueueRef.current.length > 0) {
      console.log(`[billboard-layer] sync: removed=${removed} updated=${updated} new=${entityQueueRef.current.length} total=${state.size}`);
    }

    // Pass 1 — entity billboards (RAF)
    function processEntityBatch() {
      if (billboards.isDestroyed()) { loadDone(); return; }
      const batch = entityQueueRef.current.splice(0, batchSize);
      for (const [id, data] of batch) {
        const { billboard, entry } = createBillboard(billboards, id, data, typesRef);

        // Apply common billboard properties
        billboard.scaleByDistance        = billboard.scaleByDistance ?? SCALE_BY_DIST;
        billboard.translucencyByDistance = billboard.translucencyByDistance ?? TRANSLUCENCY_BY_DIST;

        state.set(id, entry);
        labelQueueRef.current.push(id);
      }

      viewer.scene.requestRender();

      if (entityQueueRef.current.length > 0) {
        entityRafRef.current = requestAnimationFrame(processEntityBatch);
      } else {
        entityRafRef.current = null;
        if (labelQueueRef.current.length > 0) {
          labelIdleRef.current = scheduleIdle(processLabelBatch);
        } else {
          loadDone();
        }
      }
    }

    // Pass 2 — labels (idle callback, respects browser breathing room)
    function processLabelBatch(deadline) {
      if (billboards.isDestroyed()) { loadDone(); return; }
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
          if (labelScaleByDistance)        entry.label.scaleByDistance        = labelScaleByDistance;
          if (labelTranslucencyByDistance) entry.label.translucencyByDistance = labelTranslucencyByDistance;
          if (selectedIdRef.current === id) {
            entry.label.scaleByDistance        = LABEL_ALWAYS;
            entry.label.translucencyByDistance = LABEL_ALWAYS;
          }
        }
        processed++;
      }

      viewer.scene.requestRender();

      if (queue.length > 0) {
        labelIdleRef.current = scheduleIdle(processLabelBatch);
      } else {
        labelIdleRef.current = null;
        loadDone();
      }
    }

    if (entityQueueRef.current.length > 0) {
      loadStart();
      // Bulk load (e.g. timeline): process all entity billboards at once, then idle labels
      if (entityQueueRef.current.length > batchSize * 5) {
        while (entityQueueRef.current.length > 0) {
          const batch = entityQueueRef.current.splice(0, 500);
          for (const [id, data] of batch) {
            const { billboard, entry } = createBillboard(billboards, id, data, typesRef);
            billboard.scaleByDistance        = billboard.scaleByDistance ?? SCALE_BY_DIST;
            billboard.translucencyByDistance = billboard.translucencyByDistance ?? TRANSLUCENCY_BY_DIST;
            state.set(id, entry);
            labelQueueRef.current.push(id);
          }
        }
        viewer.scene.requestRender();
        if (labelQueueRef.current.length > 0) {
          labelIdleRef.current = scheduleIdle(processLabelBatch);
        } else {
          loadDone();
        }
      } else {
        entityRafRef.current = requestAnimationFrame(processEntityBatch);
      }
    } else if (labelQueueRef.current.length > 0) {
      // No new entities, but some existing ones are missing labels (re-queued after cancel)
      labelIdleRef.current = scheduleIdle(processLabelBatch);
    }
  }, [entitiesMap, viewer]);

  // Visibility toggle — react to visibleTypes changes
  useEffect(() => {
    const state = stateRef.current;
    if (!state.size) return;
    for (const entry of state.values()) {
      const shouldShow = visibleTypes.has(entry._category);
      if (entry.billboard.show !== shouldShow) {
        entry.billboard.show = shouldShow;
        if (entry.label) entry.label.show = shouldShow;
      }
    }
    if (viewer) viewer.scene.requestRender();
  }, [visibleTypes, viewer]);

  // Selection highlight
  const setSelected = useCallback((id) => {
    const state = stateRef.current;
    const prev  = selectedIdRef.current;

    if (prev) {
      const entry = state.get(prev);
      if (entry) {
        entry.billboard.color = categoryColors[entry._category] ?? categoryColors.unknown ?? categoryColors.leo;
        if (entry.label) {
          entry.label.scaleByDistance        = labelScaleByDistance ?? LABEL_VISIBLE(getSetting('LABEL_NEAR'), getSetting('LABEL_FAR'));
          entry.label.translucencyByDistance = labelTranslucencyByDistance ?? LABEL_VISIBLE(getSetting('LABEL_NEAR'), getSetting('LABEL_FAR'));
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

    if (viewer) viewer.scene.requestRender();
  }, [categoryColors, selectedColor, viewer]);

  return { billboardsRef, stateRef, selectedIdRef, typesRef, setSelected };
}
