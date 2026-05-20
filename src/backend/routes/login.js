const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const auth    = require('../auth');

// POST /login — JWT-based login (local dev / non-SPCS mode)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }

  try {
    const result = await auth.lookupUser(username);
    if (!result.result) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, result.hashed_password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const payload      = { user: result.user_name, franchise: result.franchise_id };
    const accessToken  = auth.generateAccessToken(payload);
    const refreshToken = auth.generateRefreshToken(payload);

    res.json({ accessToken, refreshToken });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /authorize — SPCS OAuth mode
// When running behind a SPCS public endpoint, the platform injects the
// Sf-Context-Current-User header. This endpoint reads that header, looks up
// the user's franchise_id, and returns a JWT so the frontend can use it
// for subsequent API calls (same flow as JWT mode, just no password needed).
router.get('/authorize', async (req, res) => {
  const username = req.headers['sf-context-current-user'];

  if (!username) {
    console.warn('/authorize called without Sf-Context-Current-User header');
    return res.status(422).json({ error: 'Missing authentication context' });
  }

  console.log(`/authorize: looking up SPCS user ${username}`);

  try {
    const result = await auth.lookupUser(username);
    if (!result.result) return res.status(401).json({ error: 'User not authorized' });

    const payload      = { user: result.user_name, franchise: result.franchise_id, preauthorized: true };
    const accessToken  = auth.generateAccessToken(payload);
    const refreshToken = auth.generateRefreshToken(payload);

    console.log(`/authorize: issued token for ${result.user_name} → franchise ${result.franchise_id}`);
    res.json({ accessToken, refreshToken });
  } catch (err) {
    console.error('/authorize error:', err);
    res.status(500).json({ error: 'Authorization failed' });
  }
});

module.exports = router;
