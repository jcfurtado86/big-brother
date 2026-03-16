import { useState, useEffect, useRef, useCallback } from 'react';
import { useTimeline } from '../contexts/TimelineContext';
import { groupByEntity, interpolateAt } from '../utils/interpolateHistory';
import { API_URL } from '../utils/api';

/**
 * Fetches historical data when timeline is active and interpolates
 * all entities to the current playback time.
 *
 * Returns { flights: Map, vessels: Map } with same format as live hooks.
 */
export function useTimelineData() {
  const tl = useTimeline();
  const [flights, setFlights] = useState(new Map());
  const [vessels, setVessels] = useState(new Map());

  // Raw history grouped by entity
  const flightHistRef = useRef(null); // Map<icao24, points[]>
  const vesselHistRef = useRef(null); // Map<mmsi, points[]>
  const fetchedRangeRef = useRef(null);

  // Interpolation function — called after fetch and during playback
  const interpolate = useCallback((t) => {
    const fHist = flightHistRef.current;
    const vHist = vesselHistRef.current;
    if (!fHist && !vHist) return;

    if (fHist) {
      const map = new Map();
      for (const [icao24, points] of fHist) {
        const interp = interpolateAt(points, t);
        if (interp && interp.lat != null && interp.lon != null) {
          map.set(icao24, {
            icao24,
            callsign: interp.callsign,
            lat: interp.lat,
            lon: interp.lon,
            altitude: interp.altitude,
            heading: interp.heading,
            velocity: interp.velocity,
            verticalRate: interp.vertical_rate,
            onGround: interp.on_ground,
            squawk: interp.squawk,
            category: interp.category ?? 0,
            fetchedAt: t,
          });
        }
      }
      setFlights(map);
    }

    if (vHist) {
      const map = new Map();
      for (const [mmsi, points] of vHist) {
        const interp = interpolateAt(points, t);
        if (interp && interp.lat != null && interp.lon != null) {
          map.set(mmsi, {
            mmsi,
            name: interp.name,
            lat: interp.lat,
            lon: interp.lon,
            cog: interp.cog,
            sog: interp.sog,
            heading: interp.heading,
            navStatus: interp.navStatus,
            shipType: interp.shipType,
            fetchedAt: t,
          });
        }
      }
      setVessels(map);
    }
  }, []);

  // Fetch history when timeline activates or range changes
  useEffect(() => {
    if (!tl.active || !tl.timeRange) {
      flightHistRef.current = null;
      vesselHistRef.current = null;
      fetchedRangeRef.current = null;
      setFlights(new Map());
      setVessels(new Map());
      return;
    }

    const { start, end } = tl.timeRange;
    // Don't re-fetch if same day (start unchanged) — end grows in live-follow mode
    if (
      fetchedRangeRef.current &&
      fetchedRangeRef.current.start === start
    ) return;

    const ac = new AbortController();

    async function fetchHistory() {
      const from = new Date(start).toISOString();
      const to = new Date(end).toISOString();

      try {
        const [fRes, vRes] = await Promise.all([
          fetch(`${API_URL}/api/flights/history/all?from=${from}&to=${to}`, { signal: ac.signal }),
          fetch(`${API_URL}/api/vessels/history/all?from=${from}&to=${to}`, { signal: ac.signal }),
        ]);

        const [fData, vData] = await Promise.all([fRes.json(), vRes.json()]);

        flightHistRef.current = groupByEntity(fData, 'icao24');
        vesselHistRef.current = groupByEntity(vData, 'mmsi');
        fetchedRangeRef.current = { start, end };

        console.log(`[timeline] loaded ${fData.length} flight points, ${vData.length} vessel points`);

        // Interpolate immediately so entities appear even when paused
        interpolate(tl.currentTime);
      } catch (e) {
        if (e.name !== 'AbortError') console.warn('[timeline] fetch error:', e.message);
      }
    }

    fetchHistory();
    return () => ac.abort();
  }, [tl.active, tl.timeRange?.start, interpolate]);

  // Interpolate during playback (~10fps throttle)
  const lastInterpRef = useRef(0);
  useEffect(() => {
    if (!tl.active) return;
    if (!flightHistRef.current && !vesselHistRef.current) return;

    const now = performance.now();
    if (now - lastInterpRef.current < 100) return; // throttle to ~10fps
    lastInterpRef.current = now;

    interpolate(tl.currentTime);
  }, [tl.active, tl.currentTime, interpolate]);

  return { flights, vessels, active: tl.active };
}
