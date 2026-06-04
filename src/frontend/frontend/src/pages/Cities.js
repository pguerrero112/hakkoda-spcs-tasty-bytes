import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import Navbar from '../components/Navbar';
import { backendURL, getRequestOptions, formatCurrency } from '../utils/utils';

function getBarColor(value, min, max) {
  if (max === min) return '#00C2A8';
  const ratio = (value - min) / (max - min);
  const hue   = 175 - ratio * 20;
  const sat   = 40  + ratio * 55;
  const light = 35  + ratio * 30;
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

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

  const loadCities = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(
        `${backendURL}/franchise/${franchise}/cities?start=${startDate}&end=${endDate}`,
        getRequestOptions(authState)
      );
      const data = await res.json();
      setCities(data);
      if (data.length) handleSelectCity(data[0].CITY, data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [franchise, startDate, endDate]);

  async function handleSelectCity(city, cityList = cities) {
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

  useEffect(() => { loadCities(); }, []);

  const totalRev    = cities.reduce((s, c) => s + (c.REVENUE || 0), 0);
  const totalOrders = cities.reduce((s, c) => s + (c.ORDER_COUNT || 0), 0);
  const selectedData = cities.find(c => c.CITY === selectedCity);

  const cityRevenues = cities.map(c => c.REVENUE || 0);
  const minRevenue   = Math.min(...cityRevenues);
  const maxRevenue   = Math.max(...cityRevenues, 1);

  // Dynamic color for selected city based on its rank
  const selectedIdx = cities.findIndex(c => c.CITY === selectedCity);
  const trendColor  = selectedIdx >= 0
    ? getBarColor(cities[selectedIdx]?.REVENUE || 0, minRevenue, maxRevenue)
    : '#00C2A8';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar authState={authState} />

      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">City Performance</h1>
            <p className="page-subtitle">Revenue breakdown by city · click any city to see its monthly trend</p>
          </div>
        </div>

        <div className="filter-bar">
          <span className="filter-label">Period</span>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span className="filter-label" style={{ color: 'var(--text-muted)' }}>→</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          <button className="btn-apply" onClick={loadCities}>Apply</button>
        </div>

        <div className="stat-row">
          <div className="stat-box">
            <div className="label">Top City</div>
            <div className="value" style={{ fontSize: 18 }}>{cities[0]?.CITY || '—'}</div>
          </div>
          <div className="stat-box" style={{ '--accent': 'var(--blue)' }}>
            <div className="label">Combined Revenue</div>
            <div className="value animated-value">{formatCurrency(totalRev)}</div>
          </div>
          <div className="stat-box" style={{ '--accent': 'var(--amber)' }}>
            <div className="label">Total Orders</div>
            <div className="value animated-value">{totalOrders.toLocaleString()}</div>
          </div>
          <div className="stat-box" style={{ '--accent': 'var(--purple)' }}>
            <div className="label">Cities Tracked</div>
            <div className="value">{cities.length}</div>
          </div>
        </div>

        {loading ? (
          <div className="grid-2">
            <div className="card"><div className="skeleton skeleton-chart" style={{ height: 480 }} /></div>
            <div className="card"><div className="skeleton skeleton-chart" style={{ height: 480 }} /></div>
          </div>
        ) : (
          <div className="grid-2">
            {/* City list */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Top 15 Cities</span>
                <span className="card-badge">by revenue</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {cities.map((c, i) => (
                  <div
                    key={c.CITY}
                    className={`city-item ${selectedCity === c.CITY ? 'active' : ''}`}
                    onClick={() => handleSelectCity(c.CITY)}
                  >
                    <span className="city-rank">#{i + 1}</span>
                    <span className="city-name">{c.CITY}</span>
                    <span className="city-country">{c.COUNTRY}</span>

                    {/* Mini bar with relative color */}
                    <div style={{ width: 60, height: 4, background: 'var(--border)', borderRadius: 2, marginRight: 12, overflow: 'hidden' }}>
                      <div style={{
                        width: `${(c.REVENUE / maxRevenue) * 100}%`,
                        height: '100%',
                        background: selectedCity === c.CITY
                          ? 'var(--accent)'
                          : getBarColor(c.REVENUE, minRevenue, maxRevenue),
                        borderRadius: 2,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>

                    <span className="city-revenue">{formatCurrency(c.REVENUE)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trend panel */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">
                  {selectedCity ? `${selectedCity} — Monthly Trend` : 'Select a city'}
                </span>
                {selectedData && (
                  <span className="card-badge">{selectedData.ACTIVE_TRUCKS} trucks</span>
                )}
              </div>

              {selectedCity && selectedData && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {[
                    ['Revenue', formatCurrency(selectedData.REVENUE), 'var(--accent)'],
                    ['Orders',  selectedData.ORDER_COUNT?.toLocaleString(), 'var(--blue)'],
                    ['Trucks',  selectedData.ACTIVE_TRUCKS, 'var(--amber)'],
                    ['Country', selectedData.COUNTRY, 'var(--purple)'],
                  ].map(([l, v, color]) => (
                    <div key={l} style={{
                      background: 'var(--bg-primary)',
                      borderRadius: 8,
                      padding: '10px 14px',
                      borderLeft: `3px solid ${color}`,
                    }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{l}</div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}

              {loadingTrend ? (
                <div className="loading"><div className="spinner" />Loading trend…</div>
              ) : trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={trend} margin={{ right: 10 }}>
                    <defs>
                      <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={trendColor} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={trendColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="MONTH_NAME" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={v => formatCurrency(v)}
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="REVENUE" stroke={trendColor} strokeWidth={2.5}
                      fill="url(#trendGrad)" dot={{ r: 3, fill: trendColor, strokeWidth: 0 }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="loading">
                  <span style={{ fontSize: 32 }}>🏙️</span>
                  Select a city to view its trend
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}