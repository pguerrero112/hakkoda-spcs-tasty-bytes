import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { enableLogin, isLoggedIn } from '../utils/utils';
import { useTheme } from '../utils/ThemeContext';
import ServiceStatus from './ServiceStatus';

export default function Navbar({ authState }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { dark, toggle } = useTheme();
  const loggedIn  = isLoggedIn(authState || location.state);
  const state     = authState || location.state;

  const links = [
    { label: 'Franchise', icon: '📊', path: '/home'    },
    { label: 'Trucks',    icon: '🚚', path: '/details' },
    { label: 'Cities',    icon: '🏙️', path: '/cities'  },
  ];

  return (
    <nav className="navbar">
      {/* Brand */}
      <div className="navbar-brand" onClick={() => navigate('/home', { state })}>
        <span style={{ fontSize: 22 }}>🍔</span>
        <span className="navbar-brand-name">Tasty Bytes</span>
        <span className="navbar-brand-tag">Analytics</span>
      </div>

      {/* Nav links */}
      {loggedIn && (
        <div className="nav-links">
          {links.map(({ label, icon, path }) => (
            <button
              key={path}
              className={`nav-btn ${location.pathname === path ? 'active' : ''}`}
              onClick={() => navigate(path, { state })}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right side */}
      <div className="nav-right">
        <ServiceStatus />

        <button className="icon-btn" onClick={toggle} title={dark ? 'Light mode' : 'Dark mode'}>
          {dark ? '☀️' : '🌙'}
        </button>

        {loggedIn && enableLogin() && (
          <button
            className="icon-btn"
            onClick={() => navigate('/login')}
            title="Sign out"
            style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#EF4444' }}
          >
            ↩
          </button>
        )}
      </div>
    </nav>
  );
}
