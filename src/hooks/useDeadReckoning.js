import { useEffect } from 'react';
import { Cartesian3 } from 'cesium';
import { deadReckon } from '../utils/geoMath';
import { FLIGHT_ALTITUDE, DEAD_RECKONING_MS } from '../providers/constants';

export function useDeadReckoning(viewer, billboardsRef, stateRef) {
  useEffect(() => {
    if (!viewer) return;
    const id = setInterval(() => {
      const billboards = billboardsRef.current;
      if (!billboards || billboards.isDestroyed()) return;
      const now = Date.now();
      for (const [, entry] of stateRef.current) {
        const dt = now - entry.fetchedAt;
        const { lat, lon } = deadReckon(entry.lat, entry.lon, entry.heading, entry.velocity, dt);
        const pos = Cartesian3.fromDegrees(lon, lat, FLIGHT_ALTITUDE);
        entry.billboard.position = pos;
        if (entry.callsign) entry.callsign.position = pos;
      }
    }, DEAD_RECKONING_MS);
    return () => clearInterval(id);
  }, [viewer, billboardsRef, stateRef]);
}
