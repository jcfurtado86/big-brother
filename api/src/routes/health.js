import db from '../db.js';

export default async function (app) {
  app.get('/health', async (req, reply) => {
    const meta = await db('data_source_meta').select('*').catch(() => []);

    const sources = {};
    for (const row of meta) {
      sources[row.source] = {
        lastUpdate: row.last_update,
        recordCount: row.record_count,
        status: row.status,
      };
    }

    return {
      status: 'ok',
      uptime: process.uptime(),
      sources,
    };
  });

  app.get('/health/db-size', async (req, reply) => {
    const [{ db_size }] = await db.raw(
      "SELECT pg_database_size(current_database()) AS db_size"
    ).then(r => r.rows);

    const tables = await db.raw(`
      SELECT relname AS table,
             pg_total_relation_size(c.oid) AS size
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY pg_total_relation_size(c.oid) DESC
    `).then(r => r.rows);

    return {
      total: Number(db_size),
      tables: tables.map(t => ({ name: t.table, size: Number(t.size) })),
    };
  });
}
