import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientValidation, backendURL, decodeToken, enableLogin } from '../utils/utils';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  // In SPCS Snowflake mode: hit /authorize to get a token from the platform
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
      // Dev mode — skip login entirely
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

  if (!enableLogin()) return null; // handled by useEffect redirect

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 40 }}>🍔</span>
          <h2>Tasty Bytes Analytics</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Sign in to your account</p>
        </div>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
