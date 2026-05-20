// ── Cities View — Hakkoda addition ─────────────────────────────────────────
// This entire page is NOT in the original Snowflake quickstart.
// It surfaces city-level performance data for a franchise using the new
// /franchise/:id/cities and /franchise/:id/cities/:city/trend endpoints.

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import Navbar from '../components/Navbar';
import { backendURL, getRequestOptions, formatCurrency } from '../utils/utils';

export default function Cities() {
  const location  = useLocation();
  const authState = location.state;
  const franchise = authState?.franchise || 1;

  const [startDate,    setStartDate]    = useState('2022-01-01');
  const [endDate,      setEndDate]      = useState('2022-10-31');
  const [cities,       setCities]       = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [trend,        setTrend]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [loadingTrend, setLoadingTrend] = useState(false);

  useEffect(() => { loadCities(); }, []);

  async function loadCities() {
    setLoading(true);
    try {
      const opts = getRequestOptions(authState);
      const res  = await fetch(
        `${backendURL}/franchise/${franchise}/cities?start=${startDate}&end=${endDate}`, opts
      );
      const data = await res.json();
      setCities(data);
      if (data.length) selectCity(data[0].CITY);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function selectCity(city) {
    setSelectedCity(city);
    setLoadingTrend(true);
    try {
      const res  = await fetch(
        `${backendURL}/franchise/${franchise}/cities/${encodeURIComponent(city)}/trend`,
        getRequestOptions(authState)
      );
      setTrend(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoadingTrend(false); }
  }

  const topCity    = cities[0];
  const totalRev   = cities.reduce((s, c) => s + (c.REVENUE || 0), 0);
  const totalOrders = cities.reduce((s, c) => s + (c.ORDER_COUNT || 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar authState={authState} />
      <div className="page">

        {/* Filter bar */}
        <div className="filter-bar">
          <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>🏙️ City View</span>
          <label>From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <label>To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          <button className="btn-apply" onClick={loadCities}>Apply</button>
        </div>

        {/* Stat row */}
        <div className="stat-row">
          <div className="stat-box">
            <div className="label">Top City</div>
            <div className="value" style={{ fontSize: 18 }}>{topCity?.CITY || '—'}</div>
          </div>
          <div className="stat-box" style={{ borderLeftColor: 'var(--blue)' }}>
            <div className="label">Total Revenue (Top 15)</div>
            <div className="value">{formatCurrency(totalRev)}</div>
          </div>
          <div className="stat-box" style={{ borderLeftColor: '#F9A825' }}>
            <div className="label">Total Orders</div>
            <div className="value">{totalOrders.toLocaleString()}</div>
          </div>
          <div className="stat-box" style={{ borderLeftColor: '#7B1FA2' }}>
            <div className="label">Cities Tracked</div>
            <div className="value">{cities.length}</div>
          </div>
        </div>

        {loading ? <div className="loading">Loading city data…</div> : (
          <div className="grid-2">
            {/* Top cities bar chart */}
            <div className="card">
              <div className="section-header">
                <span className="section-title">Top 15 Cities by Revenue</span>
              </div>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={cities} layout="vertical" margin={{ left: 80, right: 20 }}>
                  <XAxis type="number" tickFormatter={v => formatCurrency(v)} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="CITY" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip
                    formatter={(v, name) => name === 'REVENUE' ? formatCurrency(v) : v}
                    labelFormatter={label => {
                      const c = cities.find(x => x.CITY === label);
                      return `${label}${c ? ` · ${c.COUNTRY}` : ''}`;
                    }}
                  />
                  <Bar dataKey="REVENUE" fill="#00897B" radius={[0, 4, 4, 0]}
                    onClick={d => selectCity(d.CITY)}
                    cursor="pointer"
                    label={{ position: 'right', formatter: v => formatCurrency(v), fontSize: 10 }}
                  />
                </BarChart>
              </ResponsiveContainer>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                Click a bar to see monthly revenue trend for that city
              </p>
            </div>

            {/* City detail panel */}
            <div className="card">
              <div className="section-header">
                <span className="section-title">
                  {selectedCity ? `${selectedCity} — Monthly Trend` : 'Select a city'}
                </span>
              </div>

              {selectedCity && (
                <>
                  {/* City stats */}
                  {(() => {
                    const c = cities.find(x => x.CITY === selectedCity);
                    return c ? (
                      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                        {[
                          ['Revenue', formatCurrency(c.REVENUE)],
                          ['Orders',  c.ORDER_COUNT?.toLocaleString()],
                          ['Active Trucks', c.ACTIVE_TRUCKS],
                          ['Country', c.COUNTRY],
                        ].map(([l, v]) => (
                          <div key={l} style={{
                            flex: '1', minWidth: 80,
                            background: 'var(--bg-primary)', borderRadius: 8,
                            padding: '8px 12px', borderLeft: '3px solid var(--accent)',
                          }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{l}</div>
                            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}

                  {loadingTrend ? (
                    <div className="loading">Loading trend…</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={trend} margin={{ right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="MONTH_NAME" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={v => formatCurrency(v)} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={v => formatCurrency(v)} />
                        <Line type="monotone" dataKey="REVENUE" stroke="#00897B"
                          strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
