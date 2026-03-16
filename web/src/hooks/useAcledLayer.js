import { useMemo } from 'react';
import { Cartesian3 } from 'cesium';
import { getAcledIcon, ACLED_CATEGORY_COLOR } from '../providers/acledIcons';
import { useBillboardLayer } from './useBillboardLayer';
import { SELECTED_PLANE_COLOR } from '../providers/constants';
import { getSetting } from '../providers/settingsStore';

export function useAcledLayer(viewer, pointsMap, visibleTypes) {
  const config = useMemo(() => ({
    batchSize: 50,
    labelBatchSize: 40,
    categoryColors: ACLED_CATEGORY_COLOR,
    selectedColor: SELECTED_PLANE_COLOR,

    createBillboard(billboards, id, point, typesRef) {
      const category = point.category;
      const sz = getSetting('ACLED_ICON_SIZE');
      const pos = Cartesian3.fromDegrees(point.lon, point.lat, 0);
      const show = typesRef.current?.has(category) ?? true;

      const billboard = billboards.add({
        id,
        position: pos,
        image: getAcledIcon(),
        width: sz,
        height: sz,
        show,
        color: ACLED_CATEGORY_COLOR[category] ?? ACLED_CATEGORY_COLOR.battles,
      });

      return {
        billboard,
        entry: {
          billboard,
          label: null,
          _h: sz,
          _name: point.location || point.subEventType || category,
          _country: point.isoCountry || null,
          _category: category,
          _point: point,
        },
      };
    },

    updateEntry() {},

    getLabelInfo(entry) {
      return { pos: entry.billboard.position, height: entry._h, label: entry._name, country: entry._country };
    },
  }), []);

  const { stateRef, setSelected } = useBillboardLayer(
    viewer, pointsMap, visibleTypes, config
  );

  return { stateRef, setSelected };
}
