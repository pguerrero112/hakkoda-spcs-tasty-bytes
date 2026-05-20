const express = require('express');
const router  = express.Router();
const db      = require('../connect');
const auth    = require('../auth');
const sql     = require('../queries/sql');

// GET /franchise/:id
// Returns the franchise summary: available truck brands and order date range.
router.get('/:franchiseId', auth.authenticate, (req, res) => {
  const franchiseId = parseInt(req.params.franchiseId);

  // Ensure the authenticated user can only access their own franchise
  if (req.user.validation !== 'Dev' && req.user.franchise !== franchiseId) {
    return res.status(403).json({ error: 'Access denied to this franchise' });
  }

  db.getConnection().then(conn =>
    conn.execute({
      sqlText: sql.franchise_summary,
      binds:   [franchiseId],
      complete: (err, _stmt, rows) => {
        if (err) {
          console.error('franchise_summary error:', err);
          return res.status(500).json({ error: err.message });
        }
        const row = rows[0];
        res.json({
          TRUCK_BRAND_NAMES: row.TRUCK_BRAND_NAMES,
          START_DATE:        row.START_DATE,
          END_DATE:          row.END_DATE,
        });
      },
    })
  ).catch(err => res.status(500).json({ error: err.message }));
});

// GET /franchise/:id/countries?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/:franchiseId/countries', auth.authenticate, (req, res) => {
  const franchiseId = parseInt(req.params.franchiseId);
  const { start, end } = req.query;

  if (!start || !end) return res.status(400).json({ error: 'start and end query params required' });

  db.getConnection().then(conn =>
    conn.execute({
      sqlText: sql.top_countries,
      binds:   [franchiseId, start, end],
      complete: (err, _stmt, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({ COUNTRY: r.COUNTRY, REVENUE: r.REVENUE })));
      },
    })
  ).catch(err => res.status(500).json({ error: err.message }));
});

// GET /franchise/:id/trucks?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/:franchiseId/trucks', auth.authenticate, (req, res) => {
  const franchiseId = parseInt(req.params.franchiseId);
  const { start, end } = req.query;

  if (!start || !end) return res.status(400).json({ error: 'start and end query params required' });

  db.getConnection().then(conn =>
    conn.execute({
      sqlText: sql.top_trucks,
      binds:   [franchiseId, start, end],
      complete: (err, _stmt, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({ TRUCK_BRAND_NAME: r.TRUCK_BRAND_NAME, REVENUE: r.REVENUE })));
      },
    })
  ).catch(err => res.status(500).json({ error: err.message }));
});

// GET /franchise/:id/ytd-revenue
router.get('/:franchiseId/ytd-revenue', auth.authenticate, (req, res) => {
  const franchiseId = parseInt(req.params.franchiseId);

  db.getConnection().then(conn =>
    conn.execute({
      sqlText: sql.ytd_revenue,
      binds:   [franchiseId],
      complete: (err, _stmt, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({
          COUNTRY:    r.COUNTRY,
          MONTH_NUM:  r.MONTH_NUM,
          MONTH_NAME: r.MONTH_NAME,
          REVENUE:    r.REVENUE,
        })));
      },
    })
  ).catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;
