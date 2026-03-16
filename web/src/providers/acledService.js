import { API_URL } from '../utils/api';

export async function fetchAllAcled(bbox, signal, { period = '7d', from } = {}) {
  const params = from ? `from=${from}` : `period=${period}`;
  const url = `${API_URL}/api/acled?bbox=${bbox}&${params}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    console.warn('[ACLED] Fetch falhou, status:', res.status);
    return [];
  }

  const rows = await res.json();
  return rows.map(r => ({
    id: `acled_${r.event_id}`,
    lat: r.lat,
    lon: r.lon,
    category: r.category,
    eventType: r.event_type,
    subEventType: r.sub_event_type || '',
    actor1: r.actor1 || '',
    actor2: r.actor2 || '',
    country: r.country || '',
    region: r.region || '',
    location: r.location || '',
    date: r.event_date || '',
    events: r.events ?? 1,
    fatalities: r.fatalities ?? 0,
    notes: r.notes || '',
    source: r.source || '',
    admin1: r.admin1 || '',
    disorderType: r.disorder_type || '',
    isoCountry: r.iso_country || '',
  }));
}
