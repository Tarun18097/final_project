import { useState, useRef } from 'react';
import { ingestLog } from '../api/api';

const SCENARIOS = [
  {
    id: 'normal', label: '🟢 Normal Traffic',
    desc: 'Simulates 10 legitimate requests from different IPs to common endpoints',
    count: 10,
    generate: (i) => ({
      ip_address: `203.0.113.${(i * 7 + 10) % 255}`,
      method: ['GET', 'GET', 'GET', 'POST', 'GET'][i % 5],
      endpoint: ['/api/products', '/api/users/profile', '/api/health', '/api/orders', '/api/search'][i % 5],
      status_code: 200,
      response_time_ms: 80 + Math.floor(Math.random() * 120),
      user_agent: 'Mozilla/5.0 (compatible; LegitimateClient/1.0)',
    }),
  },
  {
    id: 'brute', label: '🔴 Brute Force Attack',
    desc: 'Simulates 10 rapid failed login attempts from one IP — triggers HIGH alert',
    count: 10,
    generate: () => ({
      ip_address: '185.220.101.67',
      method: 'POST',
      endpoint: '/api/auth/login',
      status_code: 401,
      response_time_ms: 220,
      user_agent: 'python-requests/2.28.0',
    }),
  },
  {
    id: 'ratelimit', label: '🟠 Rate Limit Violation',
    desc: 'Sends 35 rapid requests from one IP — triggers MEDIUM alert',
    count: 35,
    generate: (i) => ({
      ip_address: '91.108.56.130',
      method: 'GET',
      endpoint: `/api/products?page=${i}`,
      status_code: 200,
      response_time_ms: 30 + Math.floor(Math.random() * 20),
      user_agent: 'Scrapy/2.7',
    }),
  },
  {
    id: 'injection', label: '💉 SQL Injection Attempt',
    desc: "Sends a request with SQL payload in the URL — triggers CRITICAL alert",
    count: 1,
    generate: () => ({
      ip_address: '45.155.205.80',
      method: 'GET',
      endpoint: "/api/users?id=1' OR '1'='1",
      status_code: 500,
      response_time_ms: 350,
      user_agent: 'sqlmap/1.7.8#stable',
    }),
  },
  {
    id: 'mixed', label: '🌐 Mixed Realistic Traffic',
    desc: '20 mixed requests — a realistic blend of normal + some suspicious activity',
    count: 20,
    generate: (i) => {
      const normal = i % 4 !== 0;
      return {
        ip_address: normal ? `10.0.${i % 10}.${i * 3 % 255}` : '185.220.101.99',
        method: ['GET', 'POST', 'GET', 'GET', 'DELETE'][i % 5],
        endpoint: ['/api/products', '/api/orders', '/api/auth/login', '/api/search', '/api/admin'][i % 5],
        status_code: normal ? [200, 201, 200, 200, 403][i % 5] : 401,
        response_time_ms: 50 + Math.floor(Math.random() * 300),
        user_agent: normal ? 'Mozilla/5.0' : 'curl/7.81.0',
      };
    },
  },
];

export default function TrafficSimulator({ onRefresh }) {
  const [running, setRunning]   = useState(null);
  const [log, setLog]           = useState([]);
  const [custom, setCustom]     = useState({ ip: '', method: 'GET', endpoint: '/api/test', status: '200', rt: '150' });
  const stopRef = useRef(false);

  async function runScenario(scenario) {
    setRunning(scenario.id);
    setLog([]);
    stopRef.current = false;
    let sent = 0;
    for (let i = 0; i < scenario.count; i++) {
      if (stopRef.current) break;
      const entry = scenario.generate(i);
      try {
        await ingestLog(entry);
        sent++;
        setLog((prev) => [`✅ [${sent}/${scenario.count}] ${entry.method} ${entry.endpoint} → ${entry.status_code}`, ...prev].slice(0, 40));
      } catch (err) {
        setLog((prev) => [`❌ Error: ${err.message}`, ...prev].slice(0, 40));
      }
      // small delay between requests so anomaly detection can process
      await new Promise((r) => setTimeout(r, 80));
    }
    setRunning(null);
    onRefresh();
  }

  async function runCustom() {
    const sc = parseInt(custom.status);
    const rt = parseInt(custom.rt);
    if (!custom.ip.trim() || !custom.endpoint.trim() || isNaN(sc)) return;
    setRunning('custom');
    try {
      await ingestLog({ ip_address: custom.ip.trim(), method: custom.method, endpoint: custom.endpoint.trim(), status_code: sc, response_time_ms: isNaN(rt) ? 100 : rt });
      setLog((prev) => [`✅ Custom: ${custom.method} ${custom.endpoint} → ${custom.status}`, ...prev].slice(0, 40));
    } catch (err) {
      setLog((prev) => [`❌ ${err.message}`, ...prev]);
    }
    setRunning(null);
    onRefresh();
  }

  return (
    <div style={s.container}>
      <h2 style={s.title}>🎮 Traffic Simulator</h2>
      <p style={s.sub}>
        Inject real API log entries into the system to trigger anomaly detection and see live alerts on the Dashboard tab.
        <br /><strong style={{ color: '#60a5fa' }}>This sends real data to the backend — alerts will actually fire! 🚨</strong>
      </p>

      {/* Scenario Cards */}
      <div style={s.grid}>
        {SCENARIOS.map((sc) => (
          <div key={sc.id} style={s.card}>
            <div style={s.cardLabel}>{sc.label}</div>
            <div style={s.cardDesc}>{sc.desc}</div>
            <div style={s.cardFooter}>
              <span style={s.countBadge}>{sc.count} requests</span>
              <button
                style={{ ...s.btn, opacity: running ? 0.5 : 1, cursor: running ? 'not-allowed' : 'pointer' }}
                onClick={() => runScenario(sc)} disabled={!!running}>
                {running === sc.id ? '⏳ Running…' : '▶ Run'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Custom Request */}
      <div style={s.customBox}>
        <div style={s.customTitle}>✏️ Custom Request</div>
        <div style={s.customRow}>
          <input style={s.inp} placeholder="IP Address" value={custom.ip} onChange={(e) => setCustom({ ...custom, ip: e.target.value })} />
          <select style={s.sel} value={custom.method} onChange={(e) => setCustom({ ...custom, method: e.target.value })}>
            {['GET','POST','PUT','PATCH','DELETE'].map((m) => <option key={m}>{m}</option>)}
          </select>
          <input style={{ ...s.inp, flex: 2 }} placeholder="/api/endpoint" value={custom.endpoint} onChange={(e) => setCustom({ ...custom, endpoint: e.target.value })} />
          <input style={{ ...s.inp, width: '70px' }} placeholder="Status" value={custom.status} onChange={(e) => setCustom({ ...custom, status: e.target.value })} />
          <input style={{ ...s.inp, width: '80px' }} placeholder="RT (ms)" value={custom.rt} onChange={(e) => setCustom({ ...custom, rt: e.target.value })} />
          <button style={{ ...s.btn, opacity: running ? 0.5 : 1 }} onClick={runCustom} disabled={!!running}>Send</button>
        </div>
      </div>

      {/* Live Log */}
      {log.length > 0 && (
        <div style={s.logBox}>
          <div style={s.logTitle}>📟 Live output</div>
          <div style={s.logScroll}>
            {log.map((line, i) => (
              <div key={i} style={{ ...s.logLine, color: line.startsWith('❌') ? '#fca5a5' : '#86efac' }}>{line}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container:  { background: '#1e293b', borderRadius: '12px', padding: '24px' },
  title:      { fontSize: '18px', fontWeight: '700', color: '#f1f5f9', margin: '0 0 6px' },
  sub:        { color: '#64748b', fontSize: '13px', margin: '0 0 20px', lineHeight: '1.6' },
  grid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px', marginBottom: '20px' },
  card:       { background: '#0f172a', borderRadius: '10px', padding: '16px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '8px' },
  cardLabel:  { fontSize: '14px', fontWeight: '700', color: '#e2e8f0' },
  cardDesc:   { fontSize: '12px', color: '#64748b', lineHeight: '1.5', flex: 1 },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' },
  countBadge: { background: '#1e293b', color: '#475569', fontSize: '11px', padding: '2px 8px', borderRadius: '8px' },
  btn:        { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 16px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' },
  customBox:  { background: '#0f172a', borderRadius: '10px', padding: '16px', border: '1px solid #334155', marginBottom: '16px' },
  customTitle:{ fontSize: '13px', fontWeight: '700', color: '#94a3b8', marginBottom: '10px' },
  customRow:  { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' },
  inp:        { background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '7px 10px', color: '#e2e8f0', fontSize: '12px', fontFamily: 'monospace', flex: 1, minWidth: '100px' },
  sel:        { background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '7px 10px', color: '#e2e8f0', fontSize: '12px' },
  logBox:     { background: '#0f172a', borderRadius: '8px', padding: '14px', border: '1px solid #334155' },
  logTitle:   { fontSize: '12px', color: '#475569', fontWeight: '700', marginBottom: '8px' },
  logScroll:  { maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' },
  logLine:    { fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.4' },
};
