import { useMemo } from 'react';
import { Cartesian3 } from 'cesium';
import { getWebcamIcon, WEBCAM_CATEGORY_COLOR } from '../providers/webcamIcons';
import { useBillboardLayer } from './useBillboardLayer';
import { SELECTED_PLANE_COLOR, WEBCAM_SCALE, WEBCAM_TRANSLUCENCY } from '../providers/constants';
import { getSetting } from '../providers/settingsStore';

export function useWebcamLayer(viewer, pointsMap, visibleTypes) {
  const config = useMemo(() => ({
    batchSize: 50,
    labelBatchSize: 40,
    categoryColors: WEBCAM_CATEGORY_COLOR,
    selectedColor: SELECTED_PLANE_COLOR,
    labelScaleByDistance: WEBCAM_SCALE,
    labelTranslucencyByDistance: WEBCAM_TRANSLUCENCY,

    createBillboard(billboards, id, point, typesRef) {
      const sz = getSetting('WEBCAM_ICON_SIZE');
      const pos = Cartesian3.fromDegrees(point.lon, point.lat, 0);
      const show = typesRef.current?.has(point.category) ?? true;

      const billboard = billboards.add({
        id,
        position: pos,
        image: getWebcamIcon(),
        width: sz,
        height: sz,
        show,
        color: WEBCAM_CATEGORY_COLOR[point.category] ?? WEBCAM_CATEGORY_COLOR.active,
        scaleByDistance: WEBCAM_SCALE,
        translucencyByDistance: WEBCAM_TRANSLUCENCY,
      });

      return {
        billboard,
        entry: {
          billboard,
          label: null,
          _h: sz,
          _name: point.title || point.city || 'Webcam',
          _country: null,
          _category: point.category,
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
