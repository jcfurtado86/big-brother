import { idbGet, idbSet } from '../utils/idbCache';
import { ACLED_TTL_MS } from './constants';
import { API_URL } from '../utils/api';

const IDB_STORE = 'acled';
const IDB_KEY = 'global';

let globalCache = null;
let globalCacheTs = 0;

export async function fetchAllAcled(signal) {
  if (globalCache && (Date.now() - globalCacheTs) < ACLED_TTL_MS) return globalCache;

  const cached = await idbGet(IDB_STORE, IDB_KEY);
  if (cached && cached.data?.length > 0 && (Date.now() - cached.ts) < ACLED_TTL_MS) {
    console.log('[ACLED] IDB cache:', cached.data.length, 'eventos');
    globalCache = cached.data;
    globalCacheTs = cached.ts;
    return globalCache;
  }

  console.log('[ACLED] Fetching da API...');

  try {
    const res = await fetch(`${API_URL}/api/acled?bbox=-90,-180,90,180`, { signal });

    if (!res.ok) {
      console.warn('[ACLED] Fetch falhou, status:', res.status);
      return globalCache ?? [];
    }

    const rows = await res.json();
    const allPoints = rows.map(r => ({
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

    const cats = {};
    for (const p of allPoints) cats[p.category] = (cats[p.category] || 0) + 1;
    console.log(`[ACLED] ${allPoints.length} eventos:`, cats);

    globalCache = allPoints;
    globalCacheTs = Date.now();
    idbSet(IDB_STORE, IDB_KEY, { ts: globalCacheTs, data: allPoints });
    return allPoints;
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    console.warn('[ACLED] Erro:', e.message);
    return globalCache ?? [];
  }
}
