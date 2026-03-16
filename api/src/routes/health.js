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
}
