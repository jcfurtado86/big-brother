/**
 * Serviço para buscar localizações de receptores/antenas ADS-B e AIS.
 *
 * ADS-B: Busca feeders do adsb.lol via mlat-server sync.json
 * AIS:   Coleta estações base via WebSocket (AIS Message Type 4)
 */

// ── ADS-B Feeders (adsb.lol MLAT) ──────────────────────────────────────────

const REGIONS_URL = '/api/mlat/syncmap/mirror_regions.json';
const SYNC_URL    = (region) => `/api/mlat/api/0/mlat-server/${region}/sync.json`;

/**
 * Busca regiões disponíveis no MLAT server.
 * @returns {Promise<string[]>} lista de nomes de região
 */
async function fetchRegions(signal) {
  const fallback = ['0A', '0B', '0C', '0D', '1A', '2A', '2B', '2C'];
  try {
    const res = await fetch(REGIONS_URL, { signal });
    if (!res.ok) return fallback;
    const data = await res.json();
    // Format: { "0": { region: "0A", name: "...", enabled: true }, ... }
    if (typeof data === 'object' && !Array.isArray(data)) {
      return Object.values(data)
        .filter(r => r.enabled !== false)
        .map(r => r.region);
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Busca feeders de uma região.
 * @returns {Promise<Map<string, {lat, lon, user}>>}
 */
async function fetchRegionSync(region, signal) {
  const receivers = new Map();
  try {
    const res = await fetch(SYNC_URL(region), { signal });
    if (!res.ok) return receivers;
    const data = await res.json();

    for (const [id, info] of Object.entries(data)) {
      // Pula feeders com privacy ativada ou sem coordenadas
      if (!info || info.privacy) continue;
      const lat = info.lat ?? info.latitude;
      const lon = info.lon ?? info.longitude;
      if (lat == null || lon == null) continue;
      if (lat === 0 && lon === 0) continue;

      receivers.set(`${region}_${id}`, {
        id:     `${region}_${id}`,
        lat,
        lon,
        user:   info.user || id,
        region,
      });
    }
  } catch {
    // Região indisponível — ignora
  }
  return receivers;
}

/**
 * Busca todos os feeders ADS-B de todas as regiões.
 * @returns {Promise<Map<string, {id, lat, lon, user, region}>>}
 */
export async function fetchAdsbReceivers(signal) {
  const regions = await fetchRegions(signal);
  const all = new Map();

  const results = await Promise.allSettled(
    regions.map(r => fetchRegionSync(r, signal))
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const [id, feeder] of result.value) {
        all.set(id, feeder);
      }
    }
  }

  console.log(`[receivers] ADS-B feeders loaded: ${all.size}`);
  return all;
}

// ── AIS Base Stations (WebSocket) ───────────────────────────────────────────

/**
 * Abre WebSocket para coletar AIS Base Station Reports (Message Type 4).
 * Estações base transmitem sua própria posição a cada ~10s.
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

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}/ws/ais-stations`);

    ws.onopen = () => {
      console.log('[ais-stations] proxy connected');
      // Subscribe to global bbox, only BaseStationReport
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
