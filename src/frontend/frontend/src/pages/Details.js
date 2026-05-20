import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import Navbar from '../components/Navbar';
import { backendURL, getRequestOptions, formatCurrency } from '../utils/utils';

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

  async function loadCharts() {
    if (!brand) return;
    setLoading(true);
    try {
      const opts   = getRequestOptions(authState);
      const params = `start=${startDate}&end=${endDate}`;
      const [dRes, iRes] = await Promise.all([
        fetch(`${backendURL}/franchise/${franchise}/brand/${encodeURIComponent(brand)}/dow?${params}`, opts),
        fetch(`${backendURL}/franchise/${franchise}/brand/${encodeURIComponent(brand)}/items?${params}`, opts),
      ]);
      setDow(await dRes.json());
      setItems(await iRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar authState={authState} />
      <div className="page">

        {/* Filter bar */}
        <div className="filter-bar">
          <label>Truck Brand</label>
          <select value={brand} onChange={e => setBrand(e.target.value)}>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <label>From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <label>To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          <button className="btn-apply" onClick={loadCharts}>Apply</button>
        </div>

        {loading ? <div className="loading">Loading data…</div> : (
          <div className="grid-2">
            {/* Sales by Day of Week */}
            <div className="card">
              <div className="section-header">
                <span className="section-title">Sales by Day of Week</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dow} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="DAY_NAME" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={v => formatCurrency(v)} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => formatCurrency(v)} />
                  <Bar dataKey="REVENUE" fill="#00897B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Menu Items */}
            <div className="card">
              <div className="section-header">
                <span className="section-title">Top Menu Items by Revenue</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={items} layout="vertical" margin={{ left: 120, right: 20 }}>
                  <XAxis type="number" tickFormatter={v => formatCurrency(v)} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="MENU_ITEM_NAME" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip formatter={v => formatCurrency(v)} />
                  <Bar dataKey="REVENUE" fill="#1565C0" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Order count by day */}
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <div className="section-header">
                <span className="section-title">Order Volume by Day of Week</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dow} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="DAY_NAME" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="ORDER_COUNT" name="Orders" fill="#F9A825" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
