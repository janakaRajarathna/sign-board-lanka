const session = require('express-session');
const connectPgSimple = require('connect-pg-simple');

const SESSION_LIFETIME_MS = 30 * 60 * 1000;

function readSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (typeof secret !== 'string' || secret.trim() === '') {
    throw new Error('Missing session environment variable: SESSION_SECRET');
  }

  return secret;
}

function logStoreError(_message, err) {
  const code = err && typeof err.code === 'string' ? err.code : 'unknown';
  console.error(`Unexpected session store error (${code})`);
}

const secret = readSessionSecret();
const pool = require('./database');
const PgSession = connectPgSimple(session);

const sessionMiddleware = session({
  store: new PgSession({
    pool,
    schemaName: 'erp_sessions',
    tableName: 'session',
    createTableIfMissing: false,
    errorLog: logStoreError,
  }),
  secret,
  resave: false,
  saveUninitialized: false,
  rolling: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_LIFETIME_MS,
  },
});

module.exports = sessionMiddleware;
