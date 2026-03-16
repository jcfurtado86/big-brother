/**
 * Serviço para buscar localizações de receptores/antenas ADS-B.
 * Busca feeders do servidor API (que coleta do adsb.lol).
 */

import { idbGet, idbSet, idbPurgeExpired } from '../utils/idbCache';
import { RECEIVER_TTL_MS } from './constants';
import { API_URL } from '../utils/api';

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

// ── AIS Base Stations (REST) ────────────────────────────────────────────────

/**
 * Busca AIS Base Stations do endpoint REST /api/ais-stations.
 * @param {AbortSignal} [signal]
 * @returns {Promise<Map<string, {mmsi, lat, lon, name, country}>>}
 */
export async function fetchAisStations(signal) {
  const res = await fetch(`${API_URL}/api/ais-stations`, { signal });
  if (!res.ok) {
    console.warn('[ais-stations] API error:', res.status);
    return new Map();
  }

  const rows = await res.json();
  const map = new Map();
  for (const r of rows) {
    map.set(r.mmsi, {
      mmsi: r.mmsi,
      lat: r.lat,
      lon: r.lon,
      name: r.name || `AIS ${r.mmsi}`,
      country: r.country || '',
      fetchedAt: Date.now(),
    });
  }
  console.log(`[ais-stations] fetched ${map.size} stations`);
  return map;
}
