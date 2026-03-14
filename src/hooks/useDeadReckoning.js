import { useEffect } from 'react';
import { Cartesian3 } from 'cesium';
import { deadReckon } from '../utils/geoMath';
import { DEAD_RECKONING_MS, FLIGHT_ALT_SCALE } from '../providers/constants';

export function useDeadReckoning(viewer, billboardsRef, stateRef) {
  useEffect(() => {
    if (!viewer) return;
    const id = setInterval(() => {
      const billboards = billboardsRef.current;
      if (!billboards || billboards.isDestroyed()) return;
      if (stateRef.current.size === 0) return;
      const now = Date.now();
      for (const [, entry] of stateRef.current) {
        const dt = now - entry.fetchedAt;
        const { lat, lon } = deadReckon(entry.lat, entry.lon, entry.heading, entry.velocity, dt);
        const alt = (entry._alt ?? 0) * FLIGHT_ALT_SCALE;
        const pos = Cartesian3.fromDegrees(lon, lat, alt);
        entry.billboard.position = pos;
        if (entry.callsign) entry.callsign.position = pos;
      }
      viewer.scene.requestRender();
    }, DEAD_RECKONING_MS);
    return () => clearInterval(id);
  }, [viewer, billboardsRef, stateRef]);
}
