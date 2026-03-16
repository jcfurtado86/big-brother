import knexInit from 'knex';
import config from './config.js';

const knex = knexInit({
  client: 'pg',
  connection: {
    host: config.PG_HOST,
    port: config.PG_PORT,
    user: config.PG_USER,
    password: config.PG_PASS,
    database: config.PG_DB,
  },
  pool: { min: 2, max: 10 },
});

export default knex;
