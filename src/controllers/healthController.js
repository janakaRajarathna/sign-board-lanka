function getHealth(req, res) {
  res.json({
    status: 'ok',
    message: 'Sign Board Lanka ERP is running',
  });
}

async function getDatabaseHealth(req, res) {
  try {
    const pool = require('../config/database');

    await pool.query({
      text: 'SELECT 1',
      query_timeout: 3000,
    });

    res.json({
      status: 'ok',
      database: 'connected',
    });
  } catch (err) {
    const code = err && typeof err.code === 'string' ? err.code : 'unknown';
    console.error(`Database health check failed (${code})`);

    res.status(503).json({
      status: 'error',
      message: 'Database is unavailable',
    });
  }
}

module.exports = {
  getHealth,
  getDatabaseHealth,
};
