import { useEffect, useRef, useMemo } from 'react';
import { Cartesian3 } from 'cesium';
import { getSatelliteIcon, getSatelliteCategory, SATELLITE_CATEGORY_COLOR } from '../providers/satelliteIcons';
import { propagateSat } from '../providers/satelliteService';
import { useBillboardLayer } from './useBillboardLayer';
import {
  SELECTED_SATELLITE_COLOR,
  SATELLITE_BATCH_SIZE, SATELLITE_LABEL_BATCH,
  TICK_INTERVAL_MS, SAT_ICON_SIZE,
} from '../providers/constants';

export function useSatelliteLayer(viewer, satellitesMap, visibleTypes) {
  const config = useMemo(() => ({
    batchSize: SATELLITE_BATCH_SIZE,
    labelBatchSize: SATELLITE_LABEL_BATCH,
    categoryColors: SATELLITE_CATEGORY_COLOR,
    selectedColor: SELECTED_SATELLITE_COLOR,

    createBillboard(billboards, id, tle, typesRef) {
      const pos = propagateSat(tle);
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
        width: SAT_ICON_SIZE,
        height: SAT_ICON_SIZE,
        show,
        color: SATELLITE_CATEGORY_COLOR[category],
      });

      return {
        billboard,
        entry: {
          billboard,
          label: null,
          tle,
          lat, lon, alt,
          velocity: pos?.velocity ?? null,
          _h: SAT_ICON_SIZE,
          _name: tle.name,
          _category: category,
        },
      };
    },

    updateEntry(entry, tle) {
      entry.tle = tle;
    },

    getLabelInfo(entry) {
      return { pos: entry.billboard.position, height: entry._h, label: entry._name, country: null };
    },
  }), []);

  const { stateRef, selectedIdRef, typesRef, setSelected } = useBillboardLayer(
    viewer, satellitesMap, visibleTypes, config
  );

  // Real-time position propagation
  const propagateRef = useRef(null);
  useEffect(() => {
    if (!viewer) return;
    function tick() {
      if (stateRef.current.size === 0) return;
      const now = new Date();
      for (const [, entry] of stateRef.current) {
        const typeVisible = typesRef.current?.has(entry._category) ?? true;
        if (!typeVisible) continue;
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
      viewer.scene.requestRender();
    }
    tick();
    propagateRef.current = setInterval(tick, TICK_INTERVAL_MS);
    return () => { clearInterval(propagateRef.current); };
  }, [viewer]);

  return { stateRef, setSelected };
}
