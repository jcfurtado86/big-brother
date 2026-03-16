import React, { useRef, useMemo, useEffect } from 'react';
import { Cartesian3 } from 'cesium';
import { useViewer } from '../../contexts/ViewerContext';
import { useLayerState } from '../../contexts/LayerContext';
import { useFlights } from '../../hooks/useFlights';
import { useFlightLayer } from '../../hooks/useFlightLayer';
import { useSelectionHandler, useSelection } from '../../contexts/SelectionContext';
import { getProvider } from '../../providers/flightProviders';
import { deadReckon } from '../../utils/geoMath';
import { getSetting } from '../../providers/settingsStore';

export default function FlightManager({ bbox, onFlightSelect, flightStateRef: externalRef, timeline }) {
  const viewer = useViewer();
  const flightsCfg = useLayerState('flights');
  const { startFollow, updateFollow, addTrack, setLiveInterval, nextPending, isPendingStale } = useSelection();

  const isAll = flightsCfg.provider === 'all';
  const liveEnabled = flightsCfg.show && !timeline?.active;
  const openskyFlights = useFlights(liveEnabled && (flightsCfg.provider === 'opensky' || isAll), bbox, 'opensky');
  const alFlights      = useFlights(liveEnabled && (flightsCfg.provider === 'airplaneslive' || isAll), bbox, 'airplaneslive');

  const allFlights = useMemo(() => {
    // When timeline is active, use timeline data instead of live
    if (timeline?.active) return flightsCfg.show ? timeline.flights : new Map();
    if (isAll) {
      const merged = new Map();
      for (const [icao, os] of openskyFlights) {
        const al = alFlights.get(icao);
        if (al) {
          merged.set(icao, {
            ...os,
            military:     al.military,
            category:     al.category ?? os.category,
            verticalRate: al.verticalRate ?? os.verticalRate ?? null,
            squawk:       al.squawk ?? os.squawk ?? null,
            _meta:        al._meta ?? os._meta ?? null,
          });
        } else {
          merged.set(icao, os);
        }
      }
      for (const [icao, f] of alFlights) {
        if (!merged.has(icao)) merged.set(icao, f);
      }
      return merged;
    }
    if (flightsCfg.provider === 'opensky') return openskyFlights;
    return alFlights;
  }, [isAll, flightsCfg.show, flightsCfg.provider, openskyFlights, alFlights, timeline?.active, timeline?.flights]);

  // Filter flights to viewport bbox (with padding) — only create billboards for visible area
  const selectedIcaoRef = useRef(null);
  const flights = useMemo(() => {
    if (!bbox) return allFlights;
    const pad = 5; // graus de margem
    const s = bbox.south - pad, n = bbox.north + pad;
    const w = bbox.west - pad, e = bbox.east + pad;
    const filtered = new Map();
    for (const [icao, f] of allFlights) {
      if ((f.lat >= s && f.lat <= n && f.lon >= w && f.lon <= e) || icao === selectedIcaoRef.current) {
        filtered.set(icao, f);
      }
    }
    return filtered;
  }, [allFlights, bbox]);

  const { stateRef: flightStateRef, setSelected } = useFlightLayer(viewer, flights, flightsCfg.types, { timelineActive: !!timeline?.active });

  // Keep FlightCard in sync when flights Map refreshes (every 60s)
  useEffect(() => {
    const icao = selectedIcaoRef.current;
    if (!icao) return;
    onFlightSelect?.(flights.get(icao) ?? null);
  }, [flights, onFlightSelect]);

  externalRef.current = flightStateRef;

  useSelectionHandler('flight', {
    match: (id) => id != null && !id.includes(':') && !id.startsWith('vessel_') && !id.startsWith('sat_') && !id.startsWith('telecom_') && !id.startsWith('receiver_'),
    onSelect: async (id) => {
      const icao24 = id;
      const isSame = selectedIcaoRef.current === icao24;

      selectedIcaoRef.current = isSame ? null : icao24;
      setSelected(isSame ? null : icao24);
      onFlightSelect?.(isSame ? null : (icao24 ? (flights.get(icao24) ?? null) : null));
      if (!icao24 || isSame) return;

      const token = nextPending();
      try {
        const effectiveProvider = flightsCfg.provider === 'all' ? 'opensky' : flightsCfg.provider;
        const trackPoints = await getProvider(effectiveProvider).fetchTrack(icao24);
        if (isPendingStale(token)) return;
        if (!trackPoints || trackPoints.length < 2) return;

        const positions = trackPoints.map(({ lat, lon, alt }) =>
          Cartesian3.fromDegrees(lon, lat, alt)
        );

        const liveEndRef = addTrack(positions);
        if (!liveEndRef) return;

        const entry0 = flightStateRef?.current?.get(icao24);
        if (entry0) {
          const pos0 = timeline?.active
            ? entry0.billboard.position
            : (() => {
                const dt0 = Date.now() - entry0.fetchedAt;
                const { lat: lat0, lon: lon0 } = deadReckon(entry0.lat, entry0.lon, entry0.heading, entry0.velocity, dt0);
                return Cartesian3.fromDegrees(lon0, lat0, (entry0._alt ?? 0) * getSetting('FLIGHT_ALT_SCALE'));
              })();
          startFollow(pos0);
        }

        setLiveInterval(() => {
          const entry = flightStateRef?.current?.get(icao24);
          if (!entry) return;
          // During timeline, billboard position is already set by interpolation
          const pos = timeline?.active
            ? entry.billboard.position
            : (() => {
                const dt = Date.now() - entry.fetchedAt;
                const { lat, lon } = deadReckon(entry.lat, entry.lon, entry.heading, entry.velocity, dt);
                return Cartesian3.fromDegrees(lon, lat, (entry._alt ?? 0) * getSetting('FLIGHT_ALT_SCALE'));
              })();
          liveEndRef.current = pos;
          updateFollow(pos);
        }, getSetting('TICK_INTERVAL_MS'));
      } catch (e) {
        console.error('[selection] track error:', e);
      }
    },
    onClear: () => {
      selectedIcaoRef.current = null;
      setSelected(null);
      onFlightSelect?.(null);
    },
  });

  return null;
}
