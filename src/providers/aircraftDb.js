// Aircraft metadata cache.
// Previously loaded a 31MB JSON; now uses an in-memory cache populated
// lazily via API calls from useAircraftMeta.

const _cache = new Map();

/**
 * Retorna metadados da aeronave a partir do cache em memória.
 * Retorna null se o icao24 não está no cache.
 */
export function lookupAircraft(icao24) {
  if (!icao24) return null;
  return _cache.get(icao24.toLowerCase()) ?? null;
}

/**
 * Armazena metadados de uma aeronave no cache.
 * Chamado por useAircraftMeta após buscar da API.
 */
export function cacheAircraft(icao24, meta) {
  if (!icao24 || !meta) return;
  _cache.set(icao24.toLowerCase(), meta);
}

