import { useMemo } from 'react';
import { Cartesian3 } from 'cesium';
import { getGdeltIcon, GDELT_CATEGORY_COLOR } from '../providers/gdeltIcons';
import { useBillboardLayer } from './useBillboardLayer';
import { SELECTED_PLANE_COLOR } from '../providers/constants';

export function useGdeltLayer(viewer, pointsMap, visibleTypes) {
  const config = useMemo(() => ({
    batchSize: 50,
    labelBatchSize: 40,
    categoryColors: GDELT_CATEGORY_COLOR,
    selectedColor: SELECTED_PLANE_COLOR,

    createBillboard(billboards, id, point, typesRef) {
      const category = point.category || 'conflict';
      const pos = Cartesian3.fromDegrees(point.lon, point.lat, 0);
      const show = typesRef.current?.has(category) ?? true;

      const billboard = billboards.add({
        id,
        position: pos,
        image: getGdeltIcon(category),
        width: 28,
        height: 28,
        show,
        color: GDELT_CATEGORY_COLOR[category] ?? GDELT_CATEGORY_COLOR.conflict,
      });

      return {
        billboard,
        entry: {
          billboard,
          label: null,
          _h: 28,
          _name: (point.title || '').substring(0, 40),
          _country: null,
          _category: category,
          _point: point,
        },
      };
    },

    updateEntry() {},

    getLabelInfo(entry) {
      return {
        pos: entry.billboard.position,
        height: entry._h,
        label: entry._name,
        country: entry._country,
      };
    },
  }), []);

  const { stateRef, setSelected } = useBillboardLayer(
    viewer, pointsMap, visibleTypes, config
  );

  return { stateRef, setSelected };
}
