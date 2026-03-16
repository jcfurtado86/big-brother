/**
 * Parse bbox query params (south, west, north, east) and return a PostGIS WHERE clause.
 * Returns { clause, bindings } for use with knex.whereRaw().
 */
export function parseBbox(query) {
  let south, west, north, east;

  if (query.bbox) {
    // bbox=south,west,north,east
    const parts = query.bbox.split(',').map(Number);
    if (parts.length === 4) [south, west, north, east] = parts;
  } else {
    south = parseFloat(query.south ?? query.s);
    west = parseFloat(query.west ?? query.w);
    north = parseFloat(query.north ?? query.n);
    east = parseFloat(query.east ?? query.e);
  }

  if ([south, west, north, east].some(v => v == null || Number.isNaN(v))) return null;

  return {
    clause: 'ST_Within(geom, ST_MakeEnvelope(?, ?, ?, ?, 4326))',
    bindings: [west, south, east, north],
  };
}

/**
 * Build a PostGIS point from lat/lon for INSERT.
 */
export function makePoint(lon, lat) {
  return `ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)`;
}

/**
 * Build a PostGIS linestring from array of [lon, lat] pairs.
 */
export function makeLineString(coords) {
  const points = coords.map(([lon, lat]) => `${lon} ${lat}`).join(', ');
  return `ST_SetSRID(ST_MakeLine(ARRAY[${coords.map(([lon, lat]) => `ST_MakePoint(${lon}, ${lat})`).join(', ')}]), 4326)`;
}
