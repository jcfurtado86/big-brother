import { useState, useEffect, useRef } from 'react';
import { connectAisStationStream } from '../providers/receiverService';
import { AIS_STATION_FLUSH_MS, RECEIVER_TTL_MS } from '../providers/constants';
import { idbGet, idbSet } from '../utils/idbCache';

const IDB_STORE = 'receivers';
const IDB_KEY   = 'ais_stations';
const SAVE_INTERVAL = 60_000; // salva no IDB a cada 1 min

/**
 * Hook que coleta AIS Base Stations (Message Type 4) via WebSocket.
 * - Carrega cache IDB no startup (render instantâneo)
 * - WebSocket como fonte real-time
 * - Salva no IDB periodicamente
 * - Quando desligado, para o WebSocket
 */
export function useAisStations(enabled) {
  const [stations, setStations] = useState(new Map());
  const mapRef = useRef(new Map());

  useEffect(() => {
    if (!enabled) return;

    let dirty = false;

    // Carrega cache IDB primeiro
    idbGet(IDB_STORE, IDB_KEY).then(cached => {
      if (!cached || (Date.now() - cached.ts) >= RECEIVER_TTL_MS) return;
      for (const s of cached.data) {
        if (!mapRef.current.has(s.mmsi)) {
          mapRef.current.set(s.mmsi, s);
        }
      }
      if (mapRef.current.size > 0) {
        setStations(new Map(mapRef.current));
        console.log(`[ais-stations] loaded ${mapRef.current.size} from cache`);
      }
    });

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

    // Salva no IDB periodicamente
    const saveId = setInterval(() => {
      if (mapRef.current.size > 0) {
        idbSet(IDB_STORE, IDB_KEY, {
          ts: Date.now(),
          data: [...mapRef.current.values()],
        });
      }
    }, SAVE_INTERVAL);

    return () => {
      stream.close();
      clearInterval(flushId);
      clearInterval(saveId);
      // Salva ao desmontar
      if (mapRef.current.size > 0) {
        idbSet(IDB_STORE, IDB_KEY, {
          ts: Date.now(),
          data: [...mapRef.current.values()],
        });
      }
    };
  }, [enabled]);

  return stations;
}
