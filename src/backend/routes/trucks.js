const express = require('express');
const router  = express.Router();
const db      = require('../connect');
const auth    = require('../auth');
const sql     = require('../queries/sql');

// GET /franchise/:id/brand/:brand/dow?start=&end=
router.get('/:franchiseId/brand/:brand/dow', auth.authenticate, (req, res) => {
  const franchiseId = parseInt(req.params.franchiseId);
  const brand       = req.params.brand;
  const { start, end } = req.query;

  if (!start || !end) return res.status(400).json({ error: 'start and end required' });

  db.getConnection().then(conn =>
    conn.execute({
      sqlText: sql.sales_by_dow,
      binds:   [franchiseId, brand, start, end],
      complete: (err, _stmt, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({
          DOW_NUM:     r.DOW_NUM,
          DAY_NAME:    r.DAY_NAME,
          REVENUE:     r.REVENUE,
          ORDER_COUNT: r.ORDER_COUNT,
        })));
      },
    })
  ).catch(err => res.status(500).json({ error: err.message }));
});

// GET /franchise/:id/brand/:brand/items?start=&end=
router.get('/:franchiseId/brand/:brand/items', auth.authenticate, (req, res) => {
  const franchiseId = parseInt(req.params.franchiseId);
  const brand       = req.params.brand;
  const { start, end } = req.query;

  if (!start || !end) return res.status(400).json({ error: 'start and end required' });

  db.getConnection().then(conn =>
    conn.execute({
      sqlText: sql.top_items,
      binds:   [franchiseId, brand, start, end],
      complete: (err, _stmt, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({
          MENU_ITEM_NAME: r.MENU_ITEM_NAME,
          UNITS_SOLD:     r.UNITS_SOLD,
          REVENUE:        r.REVENUE,
        })));
      },
    })
  ).catch(err => res.status(500).json({ error: err.message }));
});

// GET /franchise/:id/brand/:brand/items-by-dow?start=&end=
router.get('/:franchiseId/brand/:brand/items-by-dow', auth.authenticate, (req, res) => {
  const franchiseId = parseInt(req.params.franchiseId);
  const brand       = req.params.brand;
  const { start, end } = req.query;

  if (!start || !end) return res.status(400).json({ error: 'start and end required' });

  db.getConnection().then(conn =>
    conn.execute({
      sqlText: sql.items_by_dow,
      binds:   [franchiseId, brand, start, end],
      complete: (err, _stmt, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({
          MENU_ITEM_NAME: r.MENU_ITEM_NAME,
          DAY_NAME:       r.DAY_NAME,
          UNITS_SOLD:     r.UNITS_SOLD,
        })));
      },
    })
  ).catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;
