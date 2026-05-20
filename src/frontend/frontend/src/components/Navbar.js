import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { enableLogin, isLoggedIn } from '../utils/utils';
import { useTheme } from '../utils/ThemeContext';
import ServiceStatus from './ServiceStatus';

export default function Navbar({ authState }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { dark, toggle } = useTheme();

  const loggedIn = isLoggedIn(authState || location.state);

  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', height: 56,
      background: dark ? '#0D1B2A' : '#0D2B4E',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      {/* Left — brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
           onClick={() => navigate('/home', { state: authState || location.state })}>
        <span style={{ fontSize: 20 }}>🍔</span>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 18, letterSpacing: 0.5 }}>
          Tasty Bytes
        </span>
        <span style={{ color: '#4DB6AC', fontSize: 12, marginLeft: 4 }}>Analytics</span>
      </div>

      {/* Center — nav links (only when logged in) */}
      {loggedIn && (
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: '📊 Franchise',  path: '/home'    },
            { label: '🚚 Trucks',     path: '/details' },
            { label: '🏙️ Cities',    path: '/cities'  },
          ].map(({ label, path }) => {
            const active = location.pathname === path;
            return (
              <button key={path} onClick={() => navigate(path, { state: authState || location.state })}
                style={{
                  background: active ? 'rgba(77,182,172,0.2)' : 'transparent',
                  border: active ? '1px solid #4DB6AC' : '1px solid transparent',
                  color: active ? '#4DB6AC' : '#B0BEC5',
                  borderRadius: 6, padding: '4px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                }}>
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Right — status + theme + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <ServiceStatus />

        {/* Dark mode toggle */}
        <button onClick={toggle} title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 16,
          }}>
          {dark ? '☀️' : '🌙'}
        </button>

        {/* Logout */}
        {loggedIn && enableLogin() && (
          <button onClick={() => navigate('/login')}
            style={{
              background: 'transparent', border: '1px solid #EF5350',
              color: '#EF5350', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 13,
            }}>
            Sign out
          </button>
        )}
      </div>
    </nav>
  );
}
