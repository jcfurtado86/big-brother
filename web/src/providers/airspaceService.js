import { API_URL } from '../utils/api';

const UNIT_MAP = { 0: 'M', 1: 'FT', 6: 'FL' };
const DATUM_MAP = { 0: 'GND', 1: 'MSL', 2: 'STD' };

export async function fetchAllAirspaces(bbox, signal) {
  const res = await fetch(`${API_URL}/api/airspace?bbox=${bbox}`, { signal });
  if (!res.ok) {
    console.warn('[Airspace] Fetch falhou, status:', res.status);
    return [];
  }

  const rows = await res.json();
  return rows.map(r => {
    const coords = r.coordinates;

    let latSum = 0, lonSum = 0;
    for (const [lon, lat] of coords) { latSum += lat; lonSum += lon; }
    const n = coords.length;

    const meta = r.meta || {};

    return {
      id: r.id,
      name: r.name || '',
      category: r.category || 'restricted',
      country: r.country || '',
      coordinates: coords,
      lat: latSum / n,
      lon: lonSum / n,
      upperLimit: formatLimit(meta.upperLimit),
      lowerLimit: formatLimit(meta.lowerLimit),
      upperLimitValue: r.upperLimitVal ?? 0,
      lowerLimitValue: r.lowerLimitVal ?? 0,
      upperLimitUnit: UNIT_MAP[meta.upperLimit?.unit] || '',
      lowerLimitUnit: UNIT_MAP[meta.lowerLimit?.unit] || '',
    };
  });
}

function formatLimit(limit) {
  if (!limit) return '';
  const unit = UNIT_MAP[limit.unit] || '';
  const datum = DATUM_MAP[limit.referenceDatum] || '';
  if (unit === 'FL') return `FL${limit.value}`;
  return `${limit.value} ${unit} ${datum}`.trim();
}
