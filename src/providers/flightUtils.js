/**
 * Shared flight provider utilities.
 * fetchAircraftMeta and fetchTrack are identical across providers.
 */
import { API_URL } from '../utils/api';

export async function fetchAircraftMeta(icao24) {
  console.log(`[flight-utils] fetchAircraftMeta called for ${icao24}`);
  try {
    const res = await fetch(`${API_URL}/api/aircraft/${icao24}`);
    if (!res.ok) return null;
    const d = await res.json();
    const result = {
      registration: d.registration || null,
      model:        d.model        || null,
      manufacturer: d.manufacturer || null,
      operator:     d.operator     || null,
      built:        d.built        || null,
    };
    console.log(`[flight-utils] fetchAircraftMeta result for ${icao24}:`, result);
    return result;
  } catch {
    return null;
  }
}

export async function fetchTrack(icao24) {
  console.log(`[flight-utils] fetchTrack called for ${icao24}`);
  try {
    const res = await fetch(`${API_URL}/api/flights/history/${icao24}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.length) return null;
    const track = data
      .filter(p => p.lat != null && p.lon != null)
      .map(p => ({
        lat: p.lat,
        lon: p.lon,
        alt: Math.max(p.altitude ?? 0, 500) + 2000,
      }));
    console.log(`[flight-utils] fetchTrack result for ${icao24}: ${track.length} points`);
    return track;
  } catch {
    return null;
  }
}
