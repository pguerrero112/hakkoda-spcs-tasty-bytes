import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
  AreaChart, Area,
} from 'recharts';
import Navbar from '../components/Navbar';
import { backendURL, getRequestOptions, formatCurrency } from '../utils/utils';

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span className="value" style={{ fontSize: 14 }}>
            {formatter ? formatter(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonChart({ height = 280 }) {
  return (
    <div className="card">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-chart" style={{ height }} />
    </div>
  );
}

// ── Stat box with animated value ──────────────────────────────────────────────
function StatBox({ label, value, color = 'var(--accent)', icon }) {
  const [displayed, setDisplayed] = useState('—');

  useEffect(() => {
    if (!value) return;
    // Simple count-up for numbers
    const isNum = typeof value === 'number';
    if (!isNum) { setDisplayed(value); return; }
    const duration = 600;
    const steps    = 30;
    const step     = value / steps;
    let current    = 0;
    const timer    = setInterval(() => {
      current += step;
      if (current >= value) { setDisplayed(value); clearInterval(timer); }
      else setDisplayed(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="stat-box" style={{ '--accent': color }}>
      <div className="label">{icon && <span style={{ marginRight: 4 }}>{icon}</span>}{label}</div>
      <div className="value animated-value">{displayed}</div>
    </div>
  );
}

const PALETTE = ['#00C2A8','#3B82F6','#F59E0B','#8B5CF6','#EF4444','#10B981','#F97316'];

export default function Home() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const authState = location.state;
  const franchise = authState?.franchise || 1;

  const [startDate,  setStartDate]  = useState('2022-01-01');
  const [endDate,    setEndDate]    = useState('2022-10-31');
  const [countries,  setCountries]  = useState([]);
  const [trucks,     setTrucks]     = useState([]);
  const [ytd,        setYtd]        = useState([]);
  const [summary,    setSummary]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [toast,      setToast]      = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const loadSummary = useCallback(async () => {
    try {
      const res  = await fetch(`${backendURL}/franchise/${franchise}`, getRequestOptions(authState));
      const data = await res.json();
      setSummary(data);
      if (data.START_DATE) setStartDate(data.START_DATE.split(' ')[0]);
      if (data.END_DATE)   setEndDate(data.END_DATE.split(' ')[0]);
    } catch (e) { console.error(e); }
  }, [franchise]);

  const loadCharts = useCallback(async () => {
    setLoading(true);
    try {
      const opts = getRequestOptions(authState);
      const [cRes, tRes, yRes] = await Promise.all([
        fetch(`${backendURL}/franchise/${franchise}/countries?start=${startDate}&end=${endDate}`, opts),
        fetch(`${backendURL}/franchise/${franchise}/trucks?start=${startDate}&end=${endDate}`, opts),
        fetch(`${backendURL}/franchise/${franchise}/ytd-revenue`, opts),
      ]);
      setCountries(await cRes.json());
      setTrucks(await tRes.json());
      setYtd(await yRes.json());
      showToast('Data refreshed');
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [franchise, startDate, endDate]);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadCharts(); }, []);

  // Transform YTD for recharts
  const ytdCountries = [...new Set(ytd.map(r => r.COUNTRY))].slice(0, 5);
  const ytdByMonth = [...new Set(ytd.map(r => r.MONTH_NUM))].sort().map(mn => {
    const row = { month: ytd.find(r => r.MONTH_NUM === mn)?.MONTH_NAME?.slice(0,3) || mn };
    ytdCountries.forEach(c => {
      const match = ytd.find(r => r.MONTH_NUM === mn && r.COUNTRY === c);
      row[c] = match ? Math.round(match.REVENUE) : 0;
    });
    return row;
  });

  const topRevenue = countries[0]?.REVENUE || 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar authState={authState} />

      <div className="page">
        {/* Page header */}
        <div className="page-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 className="page-title">Franchise Overview</h1>
              <span className="franchise-badge">#{franchise}</span>
            </div>
            <p className="page-subtitle">
              {summary?.TRUCK_BRAND_NAMES?.length || 0} truck brands · {startDate} — {endDate}
            </p>
          </div>
          <button
            className="btn-secondary"
            onClick={() => navigate('/cities', { state: authState })}
          >
            🏙️ City View
          </button>
        </div>

        {/* Filter bar */}
        <div className="filter-bar">
          <span className="filter-label">Period</span>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span className="filter-label" style={{ color: 'var(--text-muted)' }}>→</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          <button className="btn-apply" onClick={loadCharts}>Apply</button>
        </div>

        {/* Stat row */}
        {summary && (
          <div className="stat-row">
            <StatBox label="Truck Brands"  value={summary.TRUCK_BRAND_NAMES?.length} icon="🚚" />
            <StatBox label="Top Country"   value={countries[0]?.COUNTRY || '—'} color="var(--blue)" icon="🌍" />
            <StatBox label="Top Revenue"   value={formatCurrency(topRevenue)} color="var(--amber)" icon="💰" />
            <StatBox label="Top Brand"     value={trucks[0]?.TRUCK_BRAND_NAME || '—'} color="var(--purple)" icon="⭐" />
          </div>
        )}

        {/* Charts */}
        {loading ? (
          <>
            <div className="grid-2" style={{ marginBottom: 16 }}>
              <SkeletonChart />
              <SkeletonChart />
            </div>
            <SkeletonChart height={240} />
          </>
        ) : (
          <>
            <div className="grid-2" style={{ marginBottom: 16 }}>
              {/* Top Countries */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Top 10 Countries by Revenue</span>
                  <span className="card-badge">{countries.length}</span>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={countries.slice(0,10)} layout="vertical" margin={{ left: 55, right: 40 }}>
                    <XAxis type="number" tickFormatter={v => `$${(v/1000).toFixed(0)}k`}
                      tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="COUNTRY"
                      tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={55} />
                    <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                    <Bar dataKey="REVENUE" radius={[0, 4, 4, 0]}
                      fill="url(#accentGrad)"
                      label={{ position: 'right', formatter: v => `$${(v/1000).toFixed(0)}k`, fontSize: 10, fill: 'var(--text-muted)' }}
                    />
                    <defs>
                      <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#00C2A8" stopOpacity={0.7} />
                        <stop offset="100%" stopColor="#00C2A8" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top Trucks */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Top Truck Brands by Revenue</span>
                  <span className="card-badge" style={{ background: 'var(--blue-dim)', color: 'var(--blue)' }}>
                    {trucks.length}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={trucks.slice(0,10)} layout="vertical" margin={{ left: 95, right: 40 }}>
                    <XAxis type="number" tickFormatter={v => `$${(v/1000).toFixed(0)}k`}
                      tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="TRUCK_BRAND_NAME"
                      tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={95} />
                    <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                    <Bar dataKey="REVENUE" radius={[0, 4, 4, 0]} fill="url(#blueGrad)"
                      label={{ position: 'right', formatter: v => `$${(v/1000).toFixed(0)}k`, fontSize: 10, fill: 'var(--text-muted)' }}
                    />
                    <defs>
                      <linearGradient id="blueGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.7} />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* YTD Revenue — Area chart */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">YTD Revenue by Country — Monthly Trend</span>
                <span className="card-badge" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--amber)' }}>
                  2022
                </span>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={ytdByMonth} margin={{ right: 20 }}>
                  <defs>
                    {ytdCountries.map((c, i) => (
                      <linearGradient key={c} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PALETTE[i]} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={PALETTE[i]} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  {ytdCountries.map((c, i) => (
                    <Area key={c} type="monotone" dataKey={c}
                      stroke={PALETTE[i]} strokeWidth={2}
                      fill={`url(#grad${i})`}
                      dot={false} activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
