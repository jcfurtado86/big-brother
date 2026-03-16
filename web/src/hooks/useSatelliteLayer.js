import { useEffect, useRef, useMemo } from 'react';
import { Cartesian3 } from 'cesium';
import { getSatelliteIcon, getSatelliteCategory, SATELLITE_CATEGORY_COLOR } from '../providers/satelliteIcons';
import { propagateSat } from '../providers/satelliteService';
import { useBillboardLayer } from './useBillboardLayer';
import { SELECTED_SATELLITE_COLOR } from '../providers/constants';
import { getSetting } from '../providers/settingsStore';

const toDeg = (r) => r * 180 / Math.PI;

export function useSatelliteLayer(viewer, satellitesMap, visibleTypes, timeOverride) {
  const config = useMemo(() => ({
    batchSize: getSetting('SATELLITE_BATCH_SIZE'),
    labelBatchSize: getSetting('SATELLITE_LABEL_BATCH'),
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
        width: getSetting('SAT_ICON_SIZE'),
        height: getSetting('SAT_ICON_SIZE'),
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
          _h: getSetting('SAT_ICON_SIZE'),
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

  // Track timeline override time via ref (avoids re-running effect on every frame)
  const timeOverrideRef = useRef(timeOverride);
  timeOverrideRef.current = timeOverride;

  // Real-time position propagation — only for satellites visible in viewport
  const propagateRef = useRef(null);
  useEffect(() => {
    if (!viewer) return;
    function tick() {
      if (stateRef.current.size === 0) return;
      const now = timeOverrideRef.current ? new Date(timeOverrideRef.current) : new Date();

      // Viewport bounds — skip propagation for off-screen sats
      const cam = viewer.camera.positionCartographic;
      let south = -90, north = 90, west = -180, east = 180;
      if (cam) {
        const lat = toDeg(cam.latitude);
        const lon = toDeg(cam.longitude);
        const span = Math.min(90, Math.max(20, cam.height / 50000));
        south = lat - span;
        north = lat + span;
        west = lon - span;
        east = lon + span;
      }

      for (const [, entry] of stateRef.current) {
        const typeVisible = typesRef.current?.has(entry._category) ?? true;

        // Use last known position for viewport check before propagating
        const nearView = entry.lat >= south - 10 && entry.lat <= north + 10 &&
                         entry.lon >= west - 10 && entry.lon <= east + 10;

        if (!typeVisible || !nearView) {
          entry.billboard.show = false;
          if (entry.label) entry.label.show = false;
          continue;
        }

        const pos = propagateSat(entry.tle, now);
        if (!pos) continue;

        const cart = Cartesian3.fromDegrees(pos.lon, pos.lat, pos.alt * 1000);
        entry.billboard.position = cart;
        entry.billboard.show = true;
        if (entry.label) {
          entry.label.position = cart;
          entry.label.show = true;
        }
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
    propagateRef.current = setInterval(tick, getSetting('TICK_INTERVAL_MS'));
    return () => { clearInterval(propagateRef.current); };
  }, [viewer]);

  return { stateRef, setSelected };
}
