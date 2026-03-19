import db from '../db.js';
import { parseBbox } from '../utils/spatial.js';
import crypto from 'node:crypto';

const EVENT_TYPE_KEYWORDS = {
  'Battles':                    '(battle OR clashes OR fighting OR armed)',
  'Explosions/Remote violence': '(explosion OR bombing OR airstrike OR missile)',
  'Violence against civilians': '(attack civilians OR massacre OR violence)',
  'Protests':                   '(protest OR demonstration OR rally)',
  'Riots':                      '(riot OR unrest OR looting)',
  'Strategic developments':     '(strategic OR military OR ceasefire)',
};

// Fallback: search GDELT DOC API for articles (no coordinates, just news)
async function fetchFromDocApi(eventType, country, date) {
  const keywords = EVENT_TYPE_KEYWORDS[eventType] || '(conflict OR crisis)';

  const d = new Date(date);
  const start = new Date(d);
  start.setUTCDate(start.getUTCDate() - 3);
  const end = new Date(d);
  end.setUTCDate(end.getUTCDate() + 1);

  const fmt = (dt) => dt.toISOString().replace(/[-T:]/g, '').slice(0, 14);

  // Build query: keywords + country if available
  let query = keywords;
  if (country) {
    query += ` sourcecountry:${country.toLowerCase()}`;
  }

  const params = new URLSearchParams({
    query,
    mode: 'artlist',
    maxrecords: '20',
    format: 'json',
    startdatetime: fmt(start),
    enddatetime: fmt(end),
    sort: 'datedesc',
  });

  const url = `https://api.gdeltproject.org/api/v2/doc/doc?${params}`;
  console.log('[gdelt] Fetching related from DOC API:', url);

  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) {
    console.error('[gdelt] DOC API error:', res.status);
    return [];
  }

  const data = await res.json().catch(() => null);
  if (!data?.articles) return [];

  return data.articles.slice(0, 10).map(art => ({
    id: crypto.createHash('sha256').update(art.url || '').digest('hex').slice(0, 32),
    title: art.title || '',
    url: art.url || '',
    domain: art.domain || '',
    socialimage: art.socialimage || '',
    tone: 0,
    tone_label: 'neutral',
    country: art.sourcecountry || '',
    source_date: art.seendate || '',
  }));
}

export default async function (app) {
  // Noticias correlacionadas a um evento ACLED
  app.get('/gdelt/related', async (req, reply) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const date = req.query.date;
    const eventType = req.query.event_type || '';
    const country = req.query.country || '';
    const radiusKm = parseInt(req.query.radius, 10) || 100;

    if (isNaN(lat) || isNaN(lng) || !date) {
      return reply.code(400).send({ error: 'lat, lng, date required' });
    }

    // 1. Buscar no banco local primeiro (Event Export data com coordenadas)
    const d = new Date(date);
    const start = new Date(d);
    start.setUTCDate(start.getUTCDate() - 3);
    const end = new Date(d);
    end.setUTCDate(end.getUTCDate() + 1);

    const local = await db('gdelt_events')
      .select('id', 'title', 'url', 'domain', 'socialimage', 'tone', 'tone_label',
              'lat', 'lng', 'country', 'event_type', 'source_date', 'seen_at',
              'actor1_name', 'actor2_name', 'action_geo_name', 'goldstein_scale')
      .whereRaw(`
        geom && ST_Expand(ST_MakePoint(?, ?)::geometry, ? / 111.0)
        AND ST_DWithin(geom::geography, ST_MakePoint(?, ?)::geography, ?)
      `, [lng, lat, radiusKm, lng, lat, radiusKm * 1000])
      .where('source_date', '>=', start.toISOString())
      .where('source_date', '<=', end.toISOString())
      .orderBy('source_date', 'desc')
      .limit(10);

    if (local.length > 0) {
      return local;
    }

    // 2. Fallback: buscar artigos no DOC API (sem coordenadas, apenas noticias)
    try {
      const articles = await fetchFromDocApi(eventType, country, date);
      return articles;
    } catch (e) {
      console.error('[gdelt] DOC API fallback error:', e.message);
      return [];
    }
  });

  // Eventos recentes para pins no globo
  app.get('/gdelt/live', async (req, reply) => {
    const bbox = parseBbox(req.query);
    const since = req.query.since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    let query = db('gdelt_events')
      .select('id', 'title', 'url', 'domain', 'socialimage', 'tone', 'tone_label',
              'lat', 'lng', 'country', 'event_type', 'source_date', 'seen_at',
              'actor1_name', 'actor2_name', 'action_geo_name', 'goldstein_scale')
      .where('seen_at', '>', since)
      .orderBy('seen_at', 'desc')
      .limit(500);

    if (bbox) {
      query = query.whereRaw(bbox.clause, bbox.bindings);
    }

    const categories = req.query.categories;
    if (categories) {
      query = query.whereIn('event_type', categories.split(','));
    }

    return query;
  });
}
