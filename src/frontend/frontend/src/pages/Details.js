import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import Navbar from '../components/Navbar';
import { backendURL, getRequestOptions, formatCurrency } from '../utils/utils';

// Color scale relative to the actual min/max of current dataset
function getBarColor(value, min, max) {
  if (max === min) return '#3B82F6';
  const ratio = (value - min) / (max - min); // 0 = lowest, 1 = highest
  // Interpolate from muted blue (low) to bright blue (high)
  const hue   = 225 - ratio * 15;  // 210 to 225 (blue range)
  const sat   = 40  + ratio * 55;  // 40% to 95%
  const light = 35  + ratio * 30;  // 35% to 65%
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

export default function Details() {
  const location  = useLocation();
  const authState = location.state;
  const franchise = authState?.franchise || 1;

  const [brands,    setBrands]    = useState([]);
  const [brand,     setBrand]     = useState('');
  const [startDate, setStartDate] = useState('2022-01-01');
  const [endDate,   setEndDate]   = useState('2022-10-31');
  const [dow,       setDow]       = useState([]);
  const [items,     setItems]     = useState([]);
  const [loading,   setLoading]   = useState(false);

  useEffect(() => { loadBrands(); }, [franchise]);
  useEffect(() => { if (brand) loadCharts(); }, [brand]);

  async function loadBrands() {
    try {
      const res  = await fetch(`${backendURL}/franchise/${franchise}`, getRequestOptions(authState));
      const data = await res.json();
      const list = data.TRUCK_BRAND_NAMES || [];
      setBrands(list);
      if (list.length) setBrand(list[0]);
      if (data.START_DATE) setStartDate(data.START_DATE.split(' ')[0]);
      if (data.END_DATE)   setEndDate(data.END_DATE.split(' ')[0]);
    } catch (e) { console.error(e); }
  }

  const loadCharts = useCallback(async () => {
    if (!brand) return;
    setLoading(true);
    try {
      const opts   = getRequestOptions(authState);
      const params = `start=${startDate}&end=${endDate}`;
      const [dRes, iRes] = await Promise.all([
        fetch(`${backendURL}/franchise/${franchise}/brand/${encodeURIComponent(brand)}/dow?${params}`, opts),
        fetch(`${backendURL}/franchise/${franchise}/brand/${encodeURIComponent(brand)}/items?${params}`, opts),
      ]);
      const dowData   = await dRes.json();
      const sortedDow = [...dowData].sort((a, b) => (a.DOW_NUM ?? 0) - (b.DOW_NUM ?? 0));
      setDow(sortedDow);
      setItems(await iRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [brand, startDate, endDate, franchise]);

  const revenues   = dow.map(d => d.REVENUE || 0);
  const minRevenue = Math.min(...revenues);
  const maxRevenue = Math.max(...revenues, 1);
  const orders     = dow.map(d => d.ORDER_COUNT || 0);
  const minOrders  = Math.min(...orders);
  const maxOrders  = Math.max(...orders, 1);
  const bestDay    = dow.reduce((best, d) => (!best || d.REVENUE > best.REVENUE) ? d : best, null);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar authState={authState} />

      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Truck Brand Deep Dive</h1>
            <p className="page-subtitle">Sales patterns by day of week and top menu items</p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="filter-bar">
          <span className="filter-label">Brand</span>
          <select value={brand} onChange={e => setBrand(e.target.value)} style={{ minWidth: 160 }}>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <span className="filter-label">Period</span>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span className="filter-label" style={{ color: 'var(--text-muted)' }}>→</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          <button className="btn-apply" onClick={loadCharts}>Apply</button>
        </div>

        {/* Quick stats */}
        {dow.length > 0 && (
          <div className="stat-row" style={{ marginBottom: 16 }}>
            <div className="stat-box">
              <div className="label">Best Day</div>
              <div className="value" style={{ fontSize: 18 }}>{bestDay?.DAY_NAME || '—'}</div>
            </div>
            <div className="stat-box" style={{ '--accent': 'var(--blue)' }}>
              <div className="label">Peak Revenue</div>
              <div className="value animated-value">{formatCurrency(bestDay?.REVENUE)}</div>
            </div>
            <div className="stat-box" style={{ '--accent': 'var(--amber)' }}>
              <div className="label">Top Menu Item</div>
              <div className="value" style={{ fontSize: 14 }}>{items[0]?.MENU_ITEM_NAME || '—'}</div>
            </div>
            <div className="stat-box" style={{ '--accent': 'var(--purple)' }}>
              <div className="label">Weekend vs Weekday</div>
              <div className="value" style={{ fontSize: 14 }}>
                {(() => {
                  const wknd = dow.filter(d => ['Sat','Sun'].includes(d.DAY_NAME)).reduce((s,d) => s + d.REVENUE, 0);
                  const wkdy = dow.filter(d => !['Sat','Sun'].includes(d.DAY_NAME)).reduce((s,d) => s + d.REVENUE, 0);
                  return wknd > wkdy ? '📈 Weekend' : '📈 Weekday';
                })()}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading"><div className="spinner" />Loading brand data…</div>
        ) : (
          <>
            <div className="grid-2" style={{ marginBottom: 16 }}>
              {/* Revenue by Day of Week */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Revenue by Day of Week</span>
                  <span className="card-badge" style={{ background: 'rgba(0,194,168,0.1)', color: 'var(--accent)' }}>
                    {brand}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dow} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="DAY_NAME" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={v => formatCurrency(v)}
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="REVENUE" radius={[4, 4, 0, 0]}>
                      {dow.map((d, i) => (
                        <Cell key={i} fill={getBarColor(d.REVENUE, minRevenue, maxRevenue)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Orders by Day */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Order Volume by Day</span>
                  <span className="card-badge" style={{ background: 'var(--blue-dim)', color: 'var(--blue)' }}>orders</span>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dow} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="DAY_NAME" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="ORDER_COUNT" name="Orders" radius={[4, 4, 0, 0]}>
                      {dow.map((d, i) => (
                        <Cell key={i} fill={getBarColor(d.ORDER_COUNT, minOrders, maxOrders, 230, 210)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Menu Items */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Top Menu Items by Revenue</span>
                <span className="card-badge" style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--purple)' }}>
                  {items.length} items
                </span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={items.slice(0, 10)} layout="vertical" margin={{ left: 140, right: 60 }}>
                  <XAxis type="number" tickFormatter={v => `$${(v/1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="MENU_ITEM_NAME"
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={140} />
                  <Tooltip
                    formatter={v => formatCurrency(v)}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="REVENUE" radius={[0, 4, 4, 0]}
                    label={{ position: 'right', formatter: v => `$${(v/1000).toFixed(0)}k`, fontSize: 10, fill: 'var(--text-muted)' }}
                  >
                    {items.slice(0, 10).map((_, i) => (
                      <Cell key={i} fill={`hsl(${260 + i * 12}, 70%, ${65 - i * 3}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}