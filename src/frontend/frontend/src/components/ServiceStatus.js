import React, { useEffect, useState } from 'react';
import { backendURL } from '../utils/utils';

export default function ServiceStatus() {
  const [status, setStatus] = useState('checking');
  const [detail, setDetail] = useState('');

  async function check() {
    try {
      const res  = await fetch(`${backendURL}/health`, { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      setStatus(data.status === 'healthy' ? 'healthy' : 'degraded');
      setDetail(data.snowflake?.status === 'connected'
        ? `Snowflake · ${data.snowflake.warehouse}`
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

  const colors = {
    healthy:  '#00C2A8',
    degraded: '#F59E0B',
    error:    '#EF4444',
    checking: '#6B7280',
  };

  const labels = {
    healthy:  'Live',
    degraded: 'Degraded',
    error:    'Offline',
    checking: '…',
  };

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'default', fontSize: 12 }}
      title={detail}
    >
      <span style={{
        position: 'relative',
        width: 8, height: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {status === 'healthy' && (
          <span style={{
            position: 'absolute',
            width: 14, height: 14,
            borderRadius: '50%',
            background: colors.healthy,
            opacity: 0.3,
            animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
          }} />
        )}
        <span style={{
          width: 8, height: 8,
          borderRadius: '50%',
          background: colors[status],
          display: 'block',
          flexShrink: 0,
        }} />
      </span>
      <span style={{ color: colors[status], fontWeight: 600 }}>
        {labels[status]}
      </span>
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
