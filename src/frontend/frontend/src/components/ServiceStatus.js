import React, { useEffect, useState } from 'react';
import { backendURL } from '../utils/utils';

// Polls the /health endpoint every 30s and shows a status indicator.
// Green = healthy, yellow = degraded (Snowflake issue), red = unreachable.
export default function ServiceStatus() {
  const [status, setStatus] = useState('checking'); // healthy | degraded | error | checking
  const [detail, setDetail] = useState('');

  async function check() {
    try {
      const res  = await fetch(`${backendURL}/health`, { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      setStatus(data.status === 'healthy' ? 'healthy' : 'degraded');
      setDetail(data.snowflake?.status === 'connected'
        ? `Connected · ${data.snowflake.warehouse}`
        : `Snowflake: ${data.snowflake?.message || 'unknown'}`);
    } catch {
      setStatus('error');
      setDetail('Backend unreachable');
    }
  }

  useEffect(() => {
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, []);

  const colors = { healthy: '#00897B', degraded: '#F9A825', error: '#C62828', checking: '#90A4AE' };
  const labels = { healthy: 'Service healthy', degraded: 'Degraded', error: 'Offline', checking: 'Checking…' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'default' }}
         title={detail}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        backgroundColor: colors[status],
        boxShadow: status === 'healthy' ? `0 0 6px ${colors.healthy}` : 'none',
        display: 'inline-block',
      }} />
      <span style={{ color: colors[status], fontWeight: 500 }}>{labels[status]}</span>
    </div>
  );
}
