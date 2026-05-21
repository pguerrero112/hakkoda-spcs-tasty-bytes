require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const franchiseRouter = require('./routes/franchise');
const trucksRouter    = require('./routes/trucks');
const citiesRouter    = require('./routes/cities');
const loginRouter     = require('./routes/login');
const healthRouter    = require('./routes/health');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS ─────────────────────────────────────────────────────────────────────
// In SPCS the router handles routing internally — CORS is only needed locally.
const corsOrigin = process.env.CLIENT_VALIDATION === 'Dev'
  ? `http://localhost:3001`
  : false;

if (corsOrigin) {
  app.use(cors({ origin: corsOrigin }));
  console.log(`CORS origin allowed: ${corsOrigin}`);
}

app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/franchise', franchiseRouter);
app.use('/franchise', trucksRouter);
app.use('/franchise', citiesRouter);
app.use('/',          loginRouter);
app.use('/health',    healthRouter);

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\nStarting up Tasty Bytes API — Hakkoda SPCS Build`);
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Client validation: ${process.env.CLIENT_VALIDATION || 'Dev'}`);
  console.log(`Using warehouse: ${process.env.SNOWFLAKE_WAREHOUSE}`);
  console.log(`Using role:      ${process.env.SNOWFLAKE_ROLE}\n`);
});
