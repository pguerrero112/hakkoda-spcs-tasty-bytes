// ── Cities routes — Hakkoda addition ──────────────────────────────────────────
// These endpoints are NOT in the original Snowflake quickstart.
// They expose city-level analytics for each franchise.

const express = require('express');
const router  = express.Router();
const db      = require('../connect');
const auth    = require('../auth');
const sql     = require('../queries/sql');

// GET /franchise/:id/cities?start=YYYY-MM-DD&end=YYYY-MM-DD
// Top 15 cities by revenue for a franchise in a date window.
router.get('/:franchiseId/cities', auth.authenticate, (req, res) => {
  const franchiseId = parseInt(req.params.franchiseId);
  const { start, end } = req.query;

  if (!start || !end) return res.status(400).json({ error: 'start and end query params required' });

  db.getConnection().then(conn =>
    conn.execute({
      sqlText: sql.top_cities,
      binds:   [franchiseId, start, end],
      complete: (err, _stmt, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({
          CITY:          r.CITY,
          COUNTRY:       r.COUNTRY,
          REVENUE:       r.REVENUE,
          ORDER_COUNT:   r.ORDER_COUNT,
          ACTIVE_TRUCKS: r.ACTIVE_TRUCKS,
        })));
      },
    })
  ).catch(err => res.status(500).json({ error: err.message }));
});

// GET /franchise/:id/cities/:city/trend
// Monthly revenue trend for a specific city within a franchise (current year).
router.get('/:franchiseId/cities/:city/trend', auth.authenticate, (req, res) => {
  const franchiseId = parseInt(req.params.franchiseId);
  const city        = req.params.city;

  db.getConnection().then(conn =>
    conn.execute({
      sqlText: sql.city_revenue_trend,
      binds:   [franchiseId, city],
      complete: (err, _stmt, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({
          CITY:       r.CITY,
          MONTH_NUM:  r.MONTH_NUM,
          MONTH_NAME: r.MONTH_NAME,
          REVENUE:    r.REVENUE,
        })));
      },
    })
  ).catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;
