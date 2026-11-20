const { Pool } = require('pg');

const REQUIRED_ENV_VARS = ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'];
const APPLICATION_DB_USER = 'signboard_app';

function readConfig() {
  const missing = REQUIRED_ENV_VARS.filter((name) => {
    const value = process.env[name];
    return typeof value !== 'string' || value.trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(`Missing PostgreSQL environment variables: ${missing.join(', ')}`);
  }

  const port = Number(process.env.PGPORT);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PGPORT must be an integer from 1 to 65535');
  }

  if (process.env.PGUSER !== APPLICATION_DB_USER) {
    throw new Error('PGUSER must be the application database user signboard_app');
  }

  return {
    host: process.env.PGHOST,
    port,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  };
}

function logPoolError(err) {
  const code = err && typeof err.code === 'string' ? err.code : 'unknown';
  console.error(`Unexpected PostgreSQL pool error (${code})`);
}

const connection = readConfig();

const pool = new Pool({
  host: connection.host,
  port: connection.port,
  database: connection.database,
  user: connection.user,
  password: connection.password,
  application_name: 'sign-board-erp',
  max: 10,
  min: 0,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  maxLifetimeSeconds: 1800,
  allowExitOnIdle: false,
});

pool.on('error', logPoolError);

module.exports = pool;
