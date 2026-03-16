/**
 * Serviço para buscar localizações de receptores/antenas ADS-B.
 * Busca feeders do servidor API (que coleta do adsb.lol).
 */

import { idbGet, idbSet, idbPurgeExpired } from '../utils/idbCache';
import { RECEIVER_TTL_MS } from './constants';
import { API_URL, WS_URL } from '../utils/api';

const IDB_STORE   = 'receivers';
const IDB_KEY     = 'adsb_all';

/**
 * Carrega receivers do cache IDB.
 * @returns {Promise<Map|null>} Map ou null se cache expirado/inexistente
 */
export async function loadCachedReceivers() {
  idbPurgeExpired(IDB_STORE, RECEIVER_TTL_MS);
  const cached = await idbGet(IDB_STORE, IDB_KEY);
  if (!cached || (Date.now() - cached.ts) >= RECEIVER_TTL_MS) return null;

  const map = new Map();
  for (const r of cached.data) map.set(r.id, r);
  console.log(`[receivers] loaded ${map.size} ADS-B feeders from cache`);
  return map;
}

/**
 * Busca todos os feeders ADS-B do servidor API.
 * Salva no IDB ao final.
 * @returns {Promise<Map<string, {id, lat, lon, user, region}>>}
 */
export async function fetchAdsbReceivers(signal) {
  console.log('[receivers] Fetching ADS-B feeders from API...');
  const res = await fetch(`${API_URL}/api/receivers?bbox=-90,-180,90,180`, { signal });
  if (!res.ok) {
    console.warn('[receivers] API error:', res.status);
    return new Map();
  }

  const rows = await res.json();
  const all = new Map();

  for (const r of rows) {
    all.set(r.id, {
      id:     r.id,
      lat:    r.lat,
      lon:    r.lon,
      user:   r.user_name || r.id,
      region: r.region || '',
      peers:  r.peers ?? 0,
    });
  }

  console.log(`[receivers] ADS-B feeders fetched: ${all.size}`);
  if (all.size > 0) {
    idbSet(IDB_STORE, IDB_KEY, { ts: Date.now(), data: [...all.values()] });
  }
  return all;
}

// ── AIS Base Stations (WebSocket) ───────────────────────────────────────────

/**
 * Abre WebSocket para coletar AIS Base Station Reports (Message Type 4).
 * Conecta ao servidor API que faz fan-out do AISStream.
 *
 * @param {function} onStation - chamada com { mmsi, lat, lon, name }
 * @param {function} onError
 * @returns {{ close: function }}
 */
export function connectAisStationStream(onStation, onError) {
  let ws = null;
  let closed = false;

  function connect() {
    if (closed) return;

    ws = new WebSocket(`${WS_URL}/ws/vessels`);

    ws.onopen = () => {
      console.log('[ais-stations] connected');
      // Subscribe to global bbox, server filters
      ws.send(JSON.stringify({
        BoundingBoxes: [[[-90, -180], [90, 180]]],
        FilterMessageTypes: ['BaseStationReport'],
      }));
    };

    let msgCount = 0;
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          console.error('[ais-stations] error:', data.error);
          onError?.(data.error);
          return;
        }

        const meta = data.MetaData;
        if (!meta) return;

        const mmsi = String(meta.MMSI);
        const lat  = meta.latitude;
        const lon  = meta.longitude;
        if (lat == null || lon == null) return;
        if (lat === 0 && lon === 0) return;

        msgCount++;
        if (msgCount <= 5 || msgCount % 50 === 0) {
          console.log(`[ais-stations] station #${msgCount}: MMSI=${mmsi} (${lat.toFixed(2)}, ${lon.toFixed(2)})`);
        }

        onStation({
          mmsi,
          lat,
          lon,
          name: (meta.ShipName || '').trim() || `AIS ${mmsi}`,
          fetchedAt: Date.now(),
        });
      } catch {
        // Mensagem mal-formada
      }
    };

    ws.onerror = () => onError?.('AIS station WebSocket error');

    ws.onclose = () => {
      if (!closed) setTimeout(connect, 10000);
    };
  }

  connect();

  return {
    close() {
      closed = true;
      if (ws) { ws.onclose = null; ws.close(); }
    },
  };
}
