import { useMemo } from 'react';
import { Cartesian3 } from 'cesium';
import { getAtcIcon, ATC_CATEGORY_COLOR } from '../providers/atcIcons';
import { useBillboardLayer } from './useBillboardLayer';
import { SELECTED_PLANE_COLOR } from '../providers/constants';
import { getSetting } from '../providers/settingsStore';

export function useAtcLayer(viewer, pointsMap, visibleTypes) {
  const config = useMemo(() => ({
    batchSize: 50,
    labelBatchSize: 40,
    categoryColors: ATC_CATEGORY_COLOR,
    selectedColor: SELECTED_PLANE_COLOR,

    createBillboard(billboards, id, point, typesRef) {
      const category = point.category;
      const sz = category === 'control_tower' ? getSetting('ATC_TOWER_SIZE') : getSetting('ATC_RADAR_SIZE');
      const pos = Cartesian3.fromDegrees(point.lon, point.lat, 0);
      const show = typesRef.current?.has(category) ?? true;

      const billboard = billboards.add({
        id,
        position: pos,
        image: getAtcIcon(category),
        width: sz,
        height: sz,
        show,
        color: ATC_CATEGORY_COLOR[category],
      });

      return {
        billboard,
        entry: {
          billboard,
          label: null,
          _h: sz,
          _name: point.name || point.icao || category,
          _country: null,
          _category: category,
          _point: point,
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

  return { stateRef, setSelected };
}
