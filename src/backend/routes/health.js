// ── Health endpoint — Hakkoda addition ────────────────────────────────────────
// Exposes a /health endpoint that SPCS service monitoring can call to verify
// the service is up and connected to Snowflake. Returns a structured JSON
// response so you can parse it in monitoring tools or dashboards.
//
// In SPCS you can check this with:
//   CALL SYSTEM$GET_SERVICE_LOGS('backend_service_[user]', '0', 'backend', 50);
// Or hit the endpoint directly from the router's /test page.

const express    = require('express');
const router     = express.Router();
const db         = require('../connect');

const START_TIME = Date.now();

// GET /health
// No authentication required — monitoring tools need to call this without credentials.
router.get('/', async (req, res) => {
  const status = {
    service:     'tasty-bytes-backend',
    build:       process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    validation:  process.env.CLIENT_VALIDATION || 'Dev',
    uptime_ms:   Date.now() - START_TIME,
    timestamp:   new Date().toISOString(),
    snowflake:   { status: 'unknown' },
  };

  // Ping Snowflake with a lightweight query
  try {
    const conn = await db.getConnection();
    await new Promise((resolve, reject) => {
      conn.execute({
        sqlText: 'SELECT 1 AS ping',
        complete: (err, _stmt, rows) => {
          if (err) return reject(err);
          resolve(rows);
        },
      });
    });
    status.snowflake = { status: 'connected', warehouse: process.env.SNOWFLAKE_WAREHOUSE };
    res.status(200).json({ status: 'healthy', ...status });
  } catch (err) {
    status.snowflake = { status: 'error', message: err.message };
    res.status(503).json({ status: 'degraded', ...status });
  }
});

module.exports = router;
