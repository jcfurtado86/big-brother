import { useMemo } from 'react';
import { Cartesian3, Math as CesiumMath } from 'cesium';
import { getVesselCategory, getVesselIcon, VESSEL_CATEGORY_COLOR } from '../providers/vesselIcons';
import { useBillboardLayer } from './useBillboardLayer';
import { SELECTED_VESSEL_COLOR, VESSEL_BATCH_SIZE, VESSEL_LABEL_BATCH } from '../providers/constants';

const MIN_LEN = 10, MAX_LEN = 400;
const MIN_PX  = 28, MAX_PX  = 56;
function vesselSize(length) {
  const l = Math.max(MIN_LEN, Math.min(MAX_LEN, length || MIN_LEN));
  return Math.round(MIN_PX + (MAX_PX - MIN_PX) * (l - MIN_LEN) / (MAX_LEN - MIN_LEN));
}

export function useVesselLayer(viewer, vesselsMap, visibleTypes) {
  const config = useMemo(() => ({
    batchSize: VESSEL_BATCH_SIZE,
    labelBatchSize: VESSEL_LABEL_BATCH,
    categoryColors: VESSEL_CATEGORY_COLOR,
    selectedColor: SELECTED_VESSEL_COLOR,

    createBillboard(billboards, mmsi, vessel, typesRef) {
      const category = getVesselCategory(vessel.shipType);
      const sz  = vesselSize(vessel.length);
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
      });

      return {
        billboard,
        entry: {
          billboard,
          label: null,
          vessel,
          lat: vessel.lat,
          lon: vessel.lon,
          _h: sz,
          _name: vessel.name || mmsi,
          _country: vessel.country,
          _pos: pos,
          _category: category,
        },
      };
    },

    updateEntry(entry, vessel) {
      const pos = Cartesian3.fromDegrees(vessel.lon, vessel.lat, 0);
      entry.billboard.position = pos;
      entry.billboard.rotation = -CesiumMath.toRadians(vessel.heading);
      if (entry.label) entry.label.position = pos;
      entry.vessel = vessel;
      entry.lat = vessel.lat;
      entry.lon = vessel.lon;
    },

    getLabelInfo(entry) {
      return { pos: entry._pos, height: entry._h, label: entry._name, country: entry._country };
    },
  }), []);

  const { stateRef, setSelected } = useBillboardLayer(
    viewer, vesselsMap, visibleTypes, config
  );

  return { stateRef, setSelected };
}
