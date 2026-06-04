import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientValidation, backendURL, decodeToken, enableLogin } from '../utils/utils';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (clientValidation === 'Snowflake') {
      fetch(`${backendURL}/authorize`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.accessToken) {
            const decoded = decodeToken(data.accessToken);
            navigate('/', { state: { ...data, franchise: decoded?.franchise } });
          }
        })
        .catch(() => {});
    } else if (clientValidation === 'Dev') {
      navigate('/', { state: { franchise: 1 } });
    }
  }, [navigate]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${backendURL}/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Login failed');
      const decoded = decodeToken(data.accessToken);
      navigate('/', { state: { ...data, franchise: decoded?.franchise } });
    } catch {
      setError('Network error — is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  if (!enableLogin()) return null;

  return (
    <div className="login-page">
      {/* Ambient glow blobs */}
      <div className="login-bg-glow" style={{
        width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(0,194,168,0.12) 0%, transparent 70%)',
        top: -100, left: -100,
      }} />
      <div className="login-bg-glow" style={{
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
        bottom: -50, right: -50,
      }} />

      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo-emoji">🍔</span>
          <h2>Tasty Bytes Analytics</h2>
          <p>Sign in to your franchise dashboard</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Username</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="intern_group1"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                Signing in…
              </span>
            ) : 'Sign in →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 20 }}>
          Powered by Snowpark Container Services
        </p>
      </div>
    </div>
  );
}
