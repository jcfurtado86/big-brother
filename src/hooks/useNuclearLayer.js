import { useMemo } from 'react';
import { Cartesian3 } from 'cesium';
import { getNuclearIcon, NUCLEAR_STATUS_COLOR } from '../providers/nuclearIcons';
import { useBillboardLayer } from './useBillboardLayer';
import { SELECTED_PLANE_COLOR } from '../providers/constants';
import { getSetting } from '../providers/settingsStore';

export function useNuclearLayer(viewer, pointsMap, visibleTypes) {
  const config = useMemo(() => ({
    batchSize: 50,
    labelBatchSize: 40,
    categoryColors: NUCLEAR_STATUS_COLOR,
    selectedColor: SELECTED_PLANE_COLOR,

    createBillboard(billboards, id, point, typesRef) {
      const category = point.status;
      const sz = getSetting('NUCLEAR_ICON_SIZE');
      const pos = Cartesian3.fromDegrees(point.lon, point.lat, 0);
      const show = typesRef.current?.has(category) ?? true;

      const billboard = billboards.add({
        id,
        position: pos,
        image: getNuclearIcon(),
        width: sz,
        height: sz,
        show,
        color: NUCLEAR_STATUS_COLOR[category] ?? NUCLEAR_STATUS_COLOR.operational,
      });

      return {
        billboard,
        entry: {
          billboard,
          label: null,
          _h: sz,
          _name: point.name,
          _country: point.country || null,
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
