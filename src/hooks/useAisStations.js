import { useState, useEffect, useRef } from 'react';
import { connectAisStationStream } from '../providers/receiverService';
import { AIS_STATION_FLUSH_MS } from '../providers/constants';

/**
 * Hook que coleta AIS Base Stations (Message Type 4) via WebSocket.
 * Estações base transmitem sua própria posição a cada ~10s.
 *
 * @param {boolean} enabled
 * @returns {Map<string, {mmsi, lat, lon, name, fetchedAt}>}
 */
export function useAisStations(enabled) {
  const [stations, setStations] = useState(new Map());
  const mapRef = useRef(new Map());

  useEffect(() => {
    if (!enabled) {
      mapRef.current.clear();
      setStations(new Map());
      return;
    }

    let dirty = false;

    const stream = connectAisStationStream(
      (station) => {
        mapRef.current.set(station.mmsi, station);
        dirty = true;
      },
      (err) => console.warn('[ais-stations]', err),
    );

    // Flush para React state periodicamente
    const flushId = setInterval(() => {
      if (dirty) {
        dirty = false;
        setStations(new Map(mapRef.current));
      }
    }, AIS_STATION_FLUSH_MS);

    return () => {
      stream.close();
      clearInterval(flushId);
    };
  }, [enabled]);

  return stations;
}
