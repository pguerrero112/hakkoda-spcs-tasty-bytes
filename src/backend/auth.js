const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcrypt');
const snowflake = require('./connect');

const VALIDATION_MODE = process.env.CLIENT_VALIDATION || 'Dev';

// ── Token helpers ─────────────────────────────────────────────────────────────
function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '6h' });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '24h' });
}

// ── Snowflake user lookup ─────────────────────────────────────────────────────
// Looks up a Snowflake username in the USERS table to find their franchise_id.
// In SPCS the username comes from the Sf-Context-Current-User header — injected
// by the platform and impossible to spoof from the client side.
function lookupUser(username) {
  return new Promise((resolve, reject) => {
    snowflake.getConnection().then(conn =>
      conn.execute({
        sqlText: `
          SELECT user_name, franchise_id, hashed_password
          FROM   users
          WHERE  UPPER(user_name) = UPPER(:1)
            AND  status = TRUE
        `,
        binds:    [username],
        complete: (err, _stmt, rows) => {
          if (err) return reject({ result: false, message: 'DB error', error: err });
          if (!rows || rows.length === 0) return resolve({ result: false, message: 'User not found' });
          const row = rows[0];
          resolve({
            result:          true,
            user_name:       row.USER_NAME,
            franchise_id:    row.FRANCHISE_ID,
            hashed_password: row.HASHED_PASSWORD,
          });
        },
      })
    ).catch(err => reject({ result: false, message: 'Connection error', error: err }));
  });
}

// ── Middleware: Snowflake header validation (SPCS mode) ───────────────────────
function validateSnowflakeHeader(req, res, next) {
  const username = req.headers['sf-context-current-user'];
  if (!username) {
    console.warn('Sf-Context-Current-User header missing — request rejected');
    return res.status(422).json({ error: 'Missing authentication context' });
  }

  console.log(`Authenticating via SPCS header: ${username}`);
  lookupUser(username).then(result => {
    if (!result.result) {
      console.warn(`User not found in USERS table: ${username}`);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = { validation: 'Snowflake', user: result.user_name, franchise: result.franchise_id };
    console.log(`Authorized: ${result.user_name} → franchise ${result.franchise_id}`);
    next();
  }).catch(err => {
    console.error('Auth error:', err.message);
    res.status(500).json({ error: 'Authentication failed' });
  });
}

// ── Middleware: JWT validation (local dev mode) ───────────────────────────────
function validateJWT(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  const token = auth.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = { validation: 'JWT', user: decoded.user, franchise: decoded.franchise };
    next();
  });
}

// ── Middleware: Dev bypass (no auth) ─────────────────────────────────────────
function validateDev(req, res, next) {
  console.warn('DEV MODE: skipping authentication — never use in production');
  req.user = { validation: 'Dev', user: 'dev_user', franchise: 1 };
  next();
}

// ── Route middleware selector ─────────────────────────────────────────────────
function authenticate(req, res, next) {
  if (VALIDATION_MODE === 'Snowflake') return validateSnowflakeHeader(req, res, next);
  if (VALIDATION_MODE === 'JWT')       return validateJWT(req, res, next);
  return validateDev(req, res, next);
}

module.exports = { authenticate, lookupUser, generateAccessToken, generateRefreshToken };
