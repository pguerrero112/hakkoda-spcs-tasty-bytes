import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, CartesianGrid,
} from 'recharts';
import Navbar from '../components/Navbar';
import { backendURL, getRequestOptions, formatCurrency } from '../utils/utils';

const COLORS = ['#00897B','#1565C0','#F9A825','#7B1FA2','#C62828','#00695C','#0D47A1'];

export default function Home() {
  const location = useLocation();
  const navigate  = useNavigate();
  const authState = location.state;
  const franchise = authState?.franchise || 1;

  const today = new Date().toISOString().split('T')[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [startDate,  setStartDate]  = useState('2022-01-01');
  const [endDate,    setEndDate]    = useState('2022-10-31');
  const [countries,  setCountries]  = useState([]);
  const [trucks,     setTrucks]     = useState([]);
  const [ytd,        setYtd]        = useState([]);
  const [summary,    setSummary]    = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => { loadSummary(); }, [franchise]);
  useEffect(() => { loadCharts(); }, []);

  async function loadSummary() {
    try {
      const res  = await fetch(`${backendURL}/franchise/${franchise}`, getRequestOptions(authState));
      const data = await res.json();
      setSummary(data);
      if (data.START_DATE) { setStartDate(data.START_DATE.split(' ')[0]); }
      if (data.END_DATE)   { setEndDate(data.END_DATE.split(' ')[0]); }
    } catch (e) { console.error(e); }
  }

  async function loadCharts() {
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
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  // Transform YTD data for recharts: group by country
  const ytdCountries = [...new Set(ytd.map(r => r.COUNTRY))].slice(0, 6);
  const ytdByMonth = [...new Set(ytd.map(r => r.MONTH_NUM))].sort().map(mn => {
    const row = { month: ytd.find(r => r.MONTH_NUM === mn)?.MONTH_NAME || mn };
    ytdCountries.forEach(c => {
      const match = ytd.find(r => r.MONTH_NUM === mn && r.COUNTRY === c);
      row[c] = match ? match.REVENUE : 0;
    });
    return row;
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar authState={authState} />
      <div className="page">

        {/* Filter bar */}
        <div className="filter-bar">
          <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>
            🏢 Franchise {franchise}
          </span>
          <label>From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <label>To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          <button className="btn-apply" onClick={loadCharts}>Apply</button>
          <button className="btn-apply" style={{ background: 'var(--blue)', marginLeft: 'auto' }}
            onClick={() => navigate('/cities', { state: authState })}>
            🏙️ City View
          </button>
        </div>

        {/* Stat row */}
        {summary && (
          <div className="stat-row">
            <div className="stat-box">
              <div className="label">Truck Brands</div>
              <div className="value">{summary.TRUCK_BRAND_NAMES?.length || '—'}</div>
            </div>
            <div className="stat-box" style={{ borderLeftColor: 'var(--blue)' }}>
              <div className="label">Top Country</div>
              <div className="value" style={{ fontSize: 18 }}>{countries[0]?.COUNTRY || '—'}</div>
            </div>
            <div className="stat-box" style={{ borderLeftColor: '#F9A825' }}>
              <div className="label">Top Revenue</div>
              <div className="value">{formatCurrency(countries[0]?.REVENUE)}</div>
            </div>
            <div className="stat-box" style={{ borderLeftColor: '#7B1FA2' }}>
              <div className="label">Top Truck Brand</div>
              <div className="value" style={{ fontSize: 16 }}>{trucks[0]?.TRUCK_BRAND_NAME || '—'}</div>
            </div>
          </div>
        )}

        {loading ? <div className="loading">Loading data…</div> : (
          <>
            <div className="grid-2" style={{ marginBottom: 20 }}>
              {/* Top Countries */}
              <div className="card">
                <div className="section-header">
                  <span className="section-title">Top 10 Countries by Revenue</span>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={countries} layout="vertical" margin={{ left: 60, right: 20 }}>
                    <XAxis type="number" tickFormatter={v => formatCurrency(v)} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="COUNTRY" tick={{ fontSize: 12 }} width={60} />
                    <Tooltip formatter={v => formatCurrency(v)} />
                    <Bar dataKey="REVENUE" fill="#00897B" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top Trucks */}
              <div className="card">
                <div className="section-header">
                  <span className="section-title">Top 10 Truck Brands by Revenue</span>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={trucks} layout="vertical" margin={{ left: 100, right: 20 }}>
                    <XAxis type="number" tickFormatter={v => formatCurrency(v)} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="TRUCK_BRAND_NAME" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip formatter={v => formatCurrency(v)} />
                    <Bar dataKey="REVENUE" fill="#1565C0" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* YTD Revenue by Country */}
            <div className="card">
              <div className="section-header">
                <span className="section-title">YTD Revenue by Country (Monthly)</span>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={ytdByMonth} margin={{ right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={v => formatCurrency(v)} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => formatCurrency(v)} />
                  <Legend />
                  {ytdCountries.map((c, i) => (
                    <Line key={c} type="monotone" dataKey={c} stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
