import { useEffect } from 'react';
import { Cartesian3 } from 'cesium';
import { deadReckon } from '../utils/geoMath';
import { getSetting } from '../providers/settingsStore';

export function useDeadReckoning(viewer, billboardsRef, stateRef, disabled = false) {
  useEffect(() => {
    if (!viewer || disabled) return;
    const id = setInterval(() => {
      const billboards = billboardsRef.current;
      if (!billboards || billboards.isDestroyed()) return;
      if (stateRef.current.size === 0) return;
      const now = Date.now();
      for (const [, entry] of stateRef.current) {
        const dt = now - entry.fetchedAt;
        const { lat, lon } = deadReckon(entry.lat, entry.lon, entry.heading, entry.velocity, dt);
        const alt = (entry._alt ?? 0) * getSetting('FLIGHT_ALT_SCALE');
        const pos = Cartesian3.fromDegrees(lon, lat, alt);
        entry.billboard.position = pos;
        if (entry.label) entry.label.position = pos;
      }
      viewer.scene.requestRender();
    }, getSetting('DEAD_RECKONING_MS'));
    return () => clearInterval(id);
  }, [viewer, billboardsRef, stateRef, disabled]);
}
