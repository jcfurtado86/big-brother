import db from '../db.js';

const GRID_SIZE = 2; // degrees

export default async function (app) {
  app.get('/heatmap/tension', async (req, reply) => {
    const period = req.query.period || '7d';
    const days = period === '1d' ? 1 : period === '30d' ? 30 : 7;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    // ACLED: event count + fatalities per grid cell
    const acledQuery = db('acled_events')
      .select(
        db.raw(`ST_X(ST_SnapToGrid(geom, ${GRID_SIZE})) as cell_lng`),
        db.raw(`ST_Y(ST_SnapToGrid(geom, ${GRID_SIZE})) as cell_lat`),
        db.raw('COUNT(*)::int as event_count'),
        db.raw('COALESCE(SUM(fatalities), 0)::int as total_fatalities'),
      )
      .where('event_date', '>=', since)
      .whereNotNull('geom')
      .groupByRaw(`ST_SnapToGrid(geom, ${GRID_SIZE})`)
      .as('acled');

    // GDELT: average negative tone + goldstein per grid cell
    const gdeltQuery = db('gdelt_events')
      .select(
        db.raw(`ST_X(ST_SnapToGrid(geom, ${GRID_SIZE})) as cell_lng`),
        db.raw(`ST_Y(ST_SnapToGrid(geom, ${GRID_SIZE})) as cell_lat`),
        db.raw('AVG(tone)::float as avg_tone'),
        db.raw('AVG(COALESCE(goldstein_scale, 0))::float as avg_goldstein'),
        db.raw('COUNT(*)::int as article_count'),
      )
      .where('seen_at', '>=', since)
      .whereNotNull('geom')
      .groupByRaw(`ST_SnapToGrid(geom, ${GRID_SIZE})`)
      .as('gdelt');

    const [acledRows, gdeltRows] = await Promise.all([acledQuery, gdeltQuery]);

    // Merge into a single grid
    const grid = new Map();

    for (const r of acledRows) {
      const key = `${r.cell_lat},${r.cell_lng}`;
      grid.set(key, {
        lat: r.cell_lat,
        lng: r.cell_lng,
        events: r.event_count,
        fatalities: r.total_fatalities,
        avg_tone: 0,
        avg_goldstein: 0,
      });
    }

    for (const r of gdeltRows) {
      const key = `${r.cell_lat},${r.cell_lng}`;
      const existing = grid.get(key);
      if (existing) {
        existing.avg_tone = r.avg_tone;
        existing.avg_goldstein = r.avg_goldstein;
      } else {
        grid.set(key, {
          lat: r.cell_lat,
          lng: r.cell_lng,
          events: 0,
          fatalities: 0,
          avg_tone: r.avg_tone,
          avg_goldstein: r.avg_goldstein,
        });
      }
    }

    // Compute tension index per cell
    const ACLED_THRESHOLD = 20;
    const result = [];

    for (const cell of grid.values()) {
      const normAcled = Math.min(1, (cell.events + cell.fatalities * 2) / ACLED_THRESHOLD);
      const normGdelt = Math.min(1, Math.abs(Math.min(0, cell.avg_tone)) / 10);
      const tension = Math.min(1, normAcled * 0.7 + normGdelt * 0.3);

      if (tension > 0.05) {
        result.push({
          lat: cell.lat,
          lng: cell.lng,
          tension: Math.round(tension * 100) / 100,
        });
      }
    }

    return result;
  });
}
