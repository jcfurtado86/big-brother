import { useEffect, useMemo, useRef } from 'react';
import { Cartesian3, PolylineCollection, Material } from 'cesium';
import { getTelecomIcon, getTelecomCategory, TELECOM_CATEGORY_COLOR } from '../providers/telecomIcons';
import { useBillboardLayer } from './useBillboardLayer';
import { SELECTED_PLANE_COLOR } from '../providers/constants';

const MAST_SIZE = 20;
const DC_SIZE   = 24;

// ── Point layer (masts + data centers) via useBillboardLayer ─────────────────

export function useTelecomLayer(viewer, pointsMap, lines, visibleTypes) {
  const config = useMemo(() => ({
    batchSize: 50,
    labelBatchSize: 40,
    categoryColors: TELECOM_CATEGORY_COLOR,
    selectedColor: SELECTED_PLANE_COLOR,

    createBillboard(billboards, id, point, typesRef) {
      const category = getTelecomCategory(point.layer);
      const sz = point.layer === 'telecoms_data_center' ? DC_SIZE : MAST_SIZE;
      const pos = Cartesian3.fromDegrees(point.lon, point.lat, 0);
      const show = typesRef.current?.has(category) ?? true;

      const billboard = billboards.add({
        id: `telecom_${id}`,
        position: pos,
        image: getTelecomIcon(),
        width: sz,
        height: sz,
        show,
        color: TELECOM_CATEGORY_COLOR[category],
      });

      return {
        billboard,
        entry: {
          billboard,
          label: null,
          _h: sz,
          _name: point.name || point.operator || category,
          _country: null,
          _category: category,
        },
      };
    },

    updateEntry() {
      // Static data — nothing to update
    },

    getLabelInfo(entry) {
      return { pos: entry.billboard.position, height: entry._h, label: entry._name, country: null };
    },
  }), []);

  const { stateRef, setSelected } = useBillboardLayer(
    viewer, pointsMap, visibleTypes, config
  );

  // ── Line layer (communication lines) via PolylineCollection ──────────────
  const polylinesRef = useRef(null);
  const lineIdsRef = useRef(new Set());

  useEffect(() => {
    if (!viewer) return;
    const collection = new PolylineCollection();
    viewer.scene.primitives.add(collection);
    polylinesRef.current = collection;
    return () => {
      if (!collection.isDestroyed()) viewer.scene.primitives.remove(collection);
      polylinesRef.current = null;
      lineIdsRef.current.clear();
    };
  }, [viewer]);

  useEffect(() => {
    const collection = polylinesRef.current;
    if (!collection || collection.isDestroyed()) return;

    const showLines = visibleTypes?.has('comm_line') ?? true;

    // Update visibility of all existing polylines
    for (let i = 0; i < collection.length; i++) {
      collection.get(i).show = showLines;
    }

    // Add new lines that haven't been rendered yet
    for (const line of lines) {
      if (lineIdsRef.current.has(line.id)) continue;
      lineIdsRef.current.add(line.id);

      const positions = line.coords.map(c => Cartesian3.fromDegrees(c.lon, c.lat, 0));
      if (positions.length < 2) continue;

      collection.add({
        positions,
        width: 2,
        material: Material.fromType('Color', {
          color: TELECOM_CATEGORY_COLOR.comm_line.withAlpha(0.7),
        }),
        show: showLines,
      });
    }
  }, [lines, visibleTypes]);

  return { stateRef, setSelected };
}
