import { useState, useEffect, useRef, useCallback } from 'react';
import { useTimeline } from '../contexts/TimelineContext';
import { groupByEntity, interpolateAt } from '../utils/interpolateHistory';
import { mmsiToCountry } from '../providers/vesselService';
import { API_URL } from '../utils/api';

const WINDOW = 5 * 60_000; // ±5 minutes
const PREFETCH_MARGIN = 2 * 60_000; // prefetch when within 2 min of buffer edge
const FETCH_COOLDOWN = 3_000; // min ms between fetches

/**
 * Sliding-window timeline data hook.
 * Fetches ±5 min around currentTime, re-fetches as playback advances.
 * Coverage is fetched once (lightweight) when timeline activates.
 */
export function useTimelineData() {
  const tl = useTimeline();
  const [flights, setFlights] = useState(new Map());
  const [vessels, setVessels] = useState(new Map());

  const flightHistRef = useRef(null);
  const vesselHistRef = useRef(null);
  const bufferRef = useRef(null); // { start, end } of fetched window
  const fetchingRef = useRef(false);
  const lastFetchRef = useRef(0);
  const abortRef = useRef(null);

  // Merge new data into existing history refs (accumulate across windows)
  const mergeData = useCallback((fData, vData) => {
    const fNew = groupByEntity(fData, 'icao24');
    const vNew = groupByEntity(vData, 'mmsi');

    // Merge flights
    if (!flightHistRef.current) {
      flightHistRef.current = fNew;
    } else {
      for (const [id, newPoints] of fNew) {
        const existing = flightHistRef.current.get(id);
        if (!existing) {
          flightHistRef.current.set(id, newPoints);
        } else {
          // Add only points we don't already have (by _t)
          const existingTimes = new Set(existing.map(p => p._t));
          for (const p of newPoints) {
            if (!existingTimes.has(p._t)) existing.push(p);
          }
          existing.sort((a, b) => a._t - b._t);
        }
      }
    }

    // Merge vessels
    if (!vesselHistRef.current) {
      vesselHistRef.current = vNew;
    } else {
      for (const [id, newPoints] of vNew) {
        const existing = vesselHistRef.current.get(id);
        if (!existing) {
          vesselHistRef.current.set(id, newPoints);
        } else {
          const existingTimes = new Set(existing.map(p => p._t));
          for (const p of newPoints) {
            if (!existingTimes.has(p._t)) existing.push(p);
          }
          existing.sort((a, b) => a._t - b._t);
        }
      }
    }
  }, []);

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
            country: interp.country || '',
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
            country: interp.country || mmsiToCountry(mmsi),
            fetchedAt: t,
          });
        }
      }
      setVessels(map);
    }
  }, []);

  // Fetch a window of data around a given time
  const fetchWindow = useCallback(async (centerTime, force = false) => {
    if (fetchingRef.current) return;
    if (!force && Date.now() - lastFetchRef.current < FETCH_COOLDOWN) return;
    fetchingRef.current = true;
    lastFetchRef.current = Date.now();

    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const winStart = centerTime - WINDOW;
    const winEnd = centerTime + WINDOW;
    const from = new Date(winStart).toISOString();
    const to = new Date(winEnd).toISOString();

    try {
      const [fRes, vRes] = await Promise.all([
        fetch(`${API_URL}/api/flights/history/all?from=${from}&to=${to}`, { signal: ac.signal }),
        fetch(`${API_URL}/api/vessels/history/all?from=${from}&to=${to}`, { signal: ac.signal }),
      ]);

      const [fData, vData] = await Promise.all([fRes.json(), vRes.json()]);

      mergeData(fData, vData);

      // Expand buffer range
      const prev = bufferRef.current;
      bufferRef.current = {
        start: prev ? Math.min(prev.start, winStart) : winStart,
        end: prev ? Math.max(prev.end, winEnd) : winEnd,
      };

      console.log(`[timeline] window ${new Date(winStart).toISOString().slice(11, 19)} – ${new Date(winEnd).toISOString().slice(11, 19)}: ${fData.length} flights, ${vData.length} vessels`);

      // Interpolate immediately
      interpolate(centerTime);
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('[timeline] fetch error:', e.message);
    } finally {
      fetchingRef.current = false;
    }
  }, [mergeData, interpolate]);

  // Fetch coverage once when timeline activates
  useEffect(() => {
    if (!tl.active || !tl.timeRange) {
      tl.setCoverage(null);
      return;
    }

    const ac = new AbortController();
    const from = new Date(tl.timeRange.start).toISOString();
    const to = new Date(tl.timeRange.end).toISOString();

    fetch(`${API_URL}/api/timeline/coverage?from=${from}&to=${to}`, { signal: ac.signal })
      .then(r => r.json())
      .then(buckets => {
        if (!ac.signal.aborted) {
          tl.setCoverage(buckets);
          console.log(`[timeline] coverage: ${buckets.length} buckets`);
        }
      })
      .catch(e => {
        if (e.name !== 'AbortError') console.warn('[timeline] coverage error:', e.message);
      });

    return () => ac.abort();
  }, [tl.active, tl.timeRange?.start]);

  // Initial fetch + re-fetch when approaching buffer edges
  useEffect(() => {
    if (!tl.active || !tl.timeRange) {
      flightHistRef.current = null;
      vesselHistRef.current = null;
      bufferRef.current = null;
      setFlights(new Map());
      setVessels(new Map());
      return;
    }

    const ct = tl.currentTime;
    const buf = bufferRef.current;

    // Need fetch if no buffer, or approaching edges
    const needsFetch = !buf ||
      ct < buf.start + PREFETCH_MARGIN ||
      ct > buf.end - PREFETCH_MARGIN;

    if (needsFetch) {
      fetchWindow(ct, !buf); // force on initial load
    }
  }, [tl.active, tl.timeRange, tl.currentTime, fetchWindow]);

  // Interpolate during playback (~10fps throttle)
  const lastInterpRef = useRef(0);
  useEffect(() => {
    if (!tl.active) return;
    if (!flightHistRef.current && !vesselHistRef.current) return;

    const now = performance.now();
    if (now - lastInterpRef.current < 100) return;
    lastInterpRef.current = now;

    interpolate(tl.currentTime);
  }, [tl.active, tl.currentTime, interpolate]);

  return { flights, vessels, active: tl.active };
}
