import { useState } from 'react';

const STATUS_COLOR = (code) => {
  if (code < 300) return '#22c55e';
  if (code < 400) return '#3b82f6';
  if (code < 500) return '#f59e0b';
  return '#ef4444';
};
const METHOD_COLOR = { GET: '#3b82f6', POST: '#22c55e', PUT: '#f59e0b', PATCH: '#a78bfa', DELETE: '#ef4444' };

export default function LogsTable({ logs = [], loading, onRefresh }) {
  const [filter, setFilter]   = useState('');
  const [methodF, setMethodF] = useState('ALL');

  const METHODS = ['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

  const filtered = logs.filter((l) => {
    const matchText   = !filter || l.ip_address?.includes(filter) || l.endpoint?.includes(filter);
    const matchMethod = methodF === 'ALL' || l.method === methodF;
    return matchText && matchMethod;
  });

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h2 style={s.title}>📋 API Request Logs <span style={s.count}>{logs.length} entries</span></h2>
        <div style={s.controls}>
          <input style={s.search} placeholder="Filter by IP or endpoint…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <div style={s.methodFilter}>
            {METHODS.map((m) => (
              <button key={m} onClick={() => setMethodF(m)}
                style={{ ...s.methodBtn, background: methodF === m ? (METHOD_COLOR[m] || '#475569') : 'transparent',
                  color: methodF === m ? '#fff' : '#64748b', borderColor: methodF === m ? (METHOD_COLOR[m] || '#475569') : '#334155' }}>
                {m}
              </button>
            ))}
          </div>
          <button style={s.refreshBtn} onClick={onRefresh}>↻ Refresh</button>
        </div>
      </div>

      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr style={s.thead}>
              {['Timestamp', 'IP Address', 'Method', 'Endpoint', 'Status', 'Response Time', 'Flag'].map((h) => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={{ ...s.td, textAlign: 'center', color: '#64748b', padding: '32px' }}>Loading logs…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} style={{ ...s.td, textAlign: 'center', color: '#475569', padding: '32px' }}>
                {logs.length === 0 ? 'No logs yet — use the Simulator or send real traffic to /api/logs/ingest' : 'No results match your filter'}
              </td></tr>
            )}
            {filtered.slice(0, 100).map((log) => (
              <tr key={log._id} style={{ ...s.tr, background: log.flagged ? '#1c0a0a' : 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.background = log.flagged ? '#2a0a0a' : '#1e293b'}
                onMouseLeave={(e) => e.currentTarget.style.background = log.flagged ? '#1c0a0a' : 'transparent'}>
                <td style={s.td}><span style={s.mono}>{new Date(log.timestamp).toLocaleTimeString()}</span></td>
                <td style={s.td}><span style={s.mono}>{log.ip_address}</span></td>
                <td style={s.td}>
                  <span style={{ ...s.methodPill, background: (METHOD_COLOR[log.method] || '#475569') + '22', color: METHOD_COLOR[log.method] || '#94a3b8', border: `1px solid ${METHOD_COLOR[log.method] || '#475569'}44` }}>
                    {log.method}
                  </span>
                </td>
                <td style={{ ...s.td, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={s.mono} title={log.endpoint}>{log.endpoint}</span>
                </td>
                <td style={s.td}>
                  <span style={{ color: STATUS_COLOR(log.status_code), fontWeight: '700', fontFamily: 'monospace' }}>
                    {log.status_code}
                  </span>
                </td>
                <td style={s.td}>
                  <span style={{ color: log.response_time_ms > 1000 ? '#ef4444' : log.response_time_ms > 500 ? '#f59e0b' : '#64748b', fontFamily: 'monospace', fontSize: '12px' }}>
                    {log.response_time_ms}ms
                  </span>
                </td>
                <td style={s.td}>
                  {log.flagged ? <span style={s.flag}>🚩 FLAGGED</span> : <span style={{ color: '#334155', fontSize: '12px' }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length > 100 && (
        <div style={{ textAlign: 'center', padding: '10px', color: '#475569', fontSize: '12px' }}>
          Showing 100 of {filtered.length} filtered results
        </div>
      )}
    </div>
  );
}

const s = {
  container:   { background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '24px' },
  header:      { marginBottom: '16px' },
  title:       { fontSize: '18px', fontWeight: '700', color: '#f1f5f9', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '10px' },
  count:       { fontSize: '13px', color: '#64748b', fontWeight: '400' },
  controls:    { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' },
  search:      { background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '7px 12px', color: '#e2e8f0', fontSize: '13px', outline: 'none', width: '220px' },
  methodFilter:{ display: 'flex', gap: '4px' },
  methodBtn:   { padding: '5px 10px', border: '1px solid', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.15s' },
  refreshBtn:  { background: 'transparent', border: '1px solid #334155', color: '#64748b', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
  tableWrap:   { overflowX: 'auto' },
  table:       { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  thead:       { background: '#0f172a' },
  th:          { padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #334155' },
  tr:          { borderBottom: '1px solid #1e293b', transition: 'background 0.1s' },
  td:          { padding: '10px 14px', color: '#cbd5e1', verticalAlign: 'middle' },
  mono:        { fontFamily: 'monospace', fontSize: '12px' },
  methodPill:  { padding: '2px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', fontFamily: 'monospace' },
  flag:        { color: '#ef4444', fontSize: '11px', fontWeight: '700' },
};
