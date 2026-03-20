import db from '../db.js';
import { getVessels } from '../cache/vesselCache.js';
import { sanctionedMMSI, sanctionedIMO } from '../pollers/sanctions.js';

export default async function briefingRoutes(app) {
  app.get('/briefing', async (req, reply) => {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    const radius = parseFloat(req.query.radius) || 200; // km

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return reply.code(400).send({ error: 'Invalid lat/lon' });
    }

    // Convert radius km to approximate degrees
    const dLat = radius / 111;
    const dLon = radius / (111 * Math.cos(lat * Math.PI / 180));
    const south = lat - dLat, north = lat + dLat;
    const west = lon - dLon, east = lon + dLon;

    const bboxClause = 'ST_Within(geom, ST_MakeEnvelope(?, ?, ?, ?, 4326))';
    const bboxBindings = [west, south, east, north];

    const since30d = new Date(Date.now() - 30 * 86400000).toISOString();
    const since14d = new Date(Date.now() - 14 * 86400000).toISOString();

    // Run all queries in parallel
    const [acled, gdelt, military, nuclear, telecom, atc, airports] = await Promise.all([
      db('acled_events')
        .select('event_id', 'lat', 'lon', 'category', 'event_type', 'sub_event_type',
                'actor1', 'country', 'location', 'event_date', 'fatalities', 'notes')
        .whereRaw(bboxClause, bboxBindings)
        .andWhere('event_date', '>=', since30d)
        .orderBy('event_date', 'desc')
        .limit(50),

      db('gdelt_events')
        .select('id', 'title', 'url', 'domain', 'socialimage', 'tone',
                'tone_label', 'lat', 'lng', 'country', 'event_type',
                'source_date', 'actor1_name', 'actor2_name', 'action_geo_name',
                'goldstein_scale')
        .whereRaw(bboxClause, bboxBindings)
        .andWhere('source_date', '>=', since14d)
        .orderBy('source_date', 'desc')
        .limit(30),

      db('military_points')
        .select('osm_id', 'lat', 'lon', 'category', 'name', 'operator', 'country')
        .whereRaw(bboxClause, bboxBindings)
        .limit(50),

      db('nuclear_plants')
        .select('id', 'lat', 'lon', 'name', 'country', 'status')
        .whereRaw(bboxClause, bboxBindings)
        .limit(20),

      db('telecom_points')
        .select('id', 'lat', 'lon', 'layer', 'name', 'operator')
        .whereRaw(bboxClause, bboxBindings)
        .limit(50),

      db('atc_points')
        .select('osm_id', 'lat', 'lon', 'category', 'name', 'icao')
        .whereRaw(bboxClause, bboxBindings)
        .limit(30),

      db('airports')
        .select('ident', 'name', 'type', 'lat', 'lon', 'iso_country', 'iata_code')
        .whereRaw(bboxClause, bboxBindings)
        .limit(30),
    ]);

    // Check sanctioned vessels currently in bbox
    const vesselsInBbox = getVessels({ south, west, north, east });
    const sanctionedInArea = vesselsInBbox
      .filter(v => sanctionedMMSI.has(v.mmsi) || (v.imo && sanctionedIMO.has(String(v.imo))))
      .map(v => ({ mmsi: v.mmsi, name: v.name, lat: v.lat, lon: v.lon, country: v.country }));

    const totalFatalities = acled.reduce((sum, e) => sum + (e.fatalities || 0), 0);
    const avgTone = gdelt.length > 0
      ? gdelt.reduce((sum, e) => sum + (e.tone || 0), 0) / gdelt.length
      : null;

    return {
      center: { lat, lon },
      radius,
      summary: {
        conflicts: acled.length,
        fatalities: totalFatalities,
        gdeltArticles: gdelt.length,
        avgTone: avgTone != null ? Math.round(avgTone * 10) / 10 : null,
        militaryBases: military.length,
        airports: airports.length,
        nuclearPlants: nuclear.length,
        telecomPoints: telecom.length,
        atcPoints: atc.length,
        sanctionedVessels: sanctionedInArea.length,
        totalVessels: vesselsInBbox.length,
      },
      acled,
      gdelt,
      military,
      nuclear,
      telecom,
      atc,
      airports,
      sanctionedVessels: sanctionedInArea,
    };
  });
}
