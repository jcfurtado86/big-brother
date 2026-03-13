// Carrega aircraft-db.json uma única vez e expõe lookup síncrono.
// O JSON tem formato: { [icao24]: [registration, model, manufacturername, operator, built] }

let _db = null;
let _loading = null;

function loadDb() {
  if (_db) return Promise.resolve(_db);
  if (_loading) return _loading;
  _loading = fetch('/aircraft-db.json')
    .then(r => r.json())
    .then(data => { _db = data; _loading = null; return _db; })
    .catch(e => { _loading = null; throw e; });
  return _loading;
}

/**
 * Retorna metadados da aeronave a partir do banco local.
 * Retorna null se o arquivo ainda não carregou ou o icao24 não existe.
 */
export function lookupAircraft(icao24) {
  if (!_db || !icao24) return null;
  const row = _db[icao24.toLowerCase()];
  if (!row) return null;
  return {
    registration: row[0] || null,
    model:        row[1] || null,
    manufacturer: row[2] || null,
    operator:     row[3] || null,
    built:        row[4] || null,
    typeCode:     row[5] || null,
    airlineIata:  row[6] || null,
  };
}

/**
 * Garante que o banco está carregado antes de fazer lookups.
 * Chame no bootstrap da aplicação ou antes do primeiro uso.
 */
export function preloadAircraftDb() {
  return loadDb();
}
