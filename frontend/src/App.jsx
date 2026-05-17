import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchLogs, fetchAlerts, fetchStats, fetchTimeline, resolveAlert, clearResolved } from './api/api';
import useSocket from './hooks/useSocket';

import LoginPage        from './components/LoginPage';
import StatsBar         from './components/StatsBar';
import AlertsPanel      from './components/AlertsPanel';
import LogsTable        from './components/LogsTable';
import TrafficChart     from './components/TrafficChart';
import TrafficSimulator from './components/TrafficSimulator';
import VulnTestRunner   from './components/VulnTestRunner';

const POLL_MS = 30000;

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
}

export default function App() {
  const [user, setUser]         = useState(getStoredUser);
  const [logs, setLogs]         = useState([]);
  const [alerts, setAlerts]     = useState([]);
  const [stats, setStats]       = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [activeTab, setTab]     = useState('dashboard');
  const [wsStatus, setWsStatus] = useState('connecting');
  const [lastUpdated, setLast]  = useState(null);
  const pollRef = useRef(null);

  // ── Load all data ───────────────────────────────────────────────────────────
  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [logsRes, alertsRes, statsRes, tlRes] = await Promise.all([
        fetchLogs(1, 50),
        fetchAlerts(),
        fetchStats(),
        fetchTimeline(),
      ]);
      setLogs(logsRes.logs        || []);
      setAlerts(alertsRes.alerts  || []);
      setStats(statsRes.stats     || null);
      setTimeline(tlRes.timeline  || []);
      setLast(new Date());
      setError('');
    } catch (err) {
      if (err.message !== 'Session expired')
        setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll every 30s + load on mount
  useEffect(() => {
    if (!user) return;
    loadAll();
    pollRef.current = setInterval(() => loadAll(true), POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [user, loadAll]);

  // ── Socket.IO real-time ─────────────────────────────────────────────────────
  useSocket({
    onNewAlert: (alert) => {
      setWsStatus('connected');
      setAlerts((prev) => {
        if (prev.find((a) => a._id === alert._id)) return prev;
        return [alert, ...prev].slice(0, 200);
      });
      setStats((prev) => prev ? { ...prev, active_alerts: (prev.active_alerts || 0) + 1 } : prev);
    },
    onNewLog: (log) => {
      setWsStatus('connected');
      setLogs((prev) => {
        if (prev.find((l) => l._id === log._id)) return prev;
        return [log, ...prev].slice(0, 50);
      });
      setStats((prev) => prev ? { ...prev, total_requests: (prev.total_requests || 0) + 1 } : prev);
    },
    onReconnect: () => {
      setWsStatus('connected');
      loadAll(true);
    },
  });

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleLogin(userData) {
    setUser(userData);
    setLoading(true);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    clearInterval(pollRef.current);
    setUser(null); setLogs([]); setAlerts([]); setStats(null); setTimeline([]);
  }

  async function handleResolve(id) {
    try {
      await resolveAlert(id);
      setAlerts((prev) => prev.map((a) => a._id === id
        ? { ...a, resolved: true, resolved_at: new Date().toISOString() } : a));
      setStats((prev) => prev ? { ...prev, active_alerts: Math.max((prev.active_alerts || 1) - 1, 0) } : prev);
    } catch (err) { console.error('Resolve failed:', err.message); }
  }

  async function handleClearResolved() {
    try {
      await clearResolved();
      setAlerts((prev) => prev.filter((a) => !a.resolved));
    } catch (err) { console.error('Clear failed:', err.message); }
  }

  // ── Auth gate ────────────────────────────────────────────────────────────────
  if (!user) return <LoginPage onLogin={handleLogin} />;

  const activeAlerts = alerts.filter((a) => !a.resolved);
  const vulnAlerts   = alerts.filter((a) => a.type === 'VULNERABILITY' && !a.resolved);

  const TABS = [
    { id: 'dashboard', label: '📊 Dashboard',   badge: activeAlerts.length > 0 ? activeAlerts.length : null },
    { id: 'tests',     label: '🛡️ Vuln Tests',  badge: vulnAlerts.length > 0 ? vulnAlerts.length : null },
    { id: 'simulator', label: '🎮 Simulator',    badge: null },
  ];

  return (
    <div style={s.root}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={s.header} className="header-pad">
        <div style={s.headerLeft}>
          <span style={{ fontSize: '30px' }}>🛡️</span>
          <div>
            <h1 style={s.h1}>API Security Platform</h1>
            <p style={s.headerSub}>Testing & Abuse Detection · UPES MCA Cybersecurity</p>
          </div>
        </div>

        <div style={s.headerRight} className="header-right">
          {lastUpdated && (
            <span style={s.lastUpdated}>🔄 {lastUpdated.toLocaleTimeString()}</span>
          )}

          {/* WS status pill */}
          <div style={{
            ...s.wsPill,
            background:   wsStatus === 'connected' ? '#052e16' : '#1c1400',
            borderColor:  wsStatus === 'connected' ? '#166534' : '#854d0e',
          }}>
            <span style={{ ...s.wsDot, background: wsStatus === 'connected' ? '#22c55e' : '#eab308',
              animation: wsStatus === 'connected' ? 'none' : 'pulse 1.5s infinite' }} />
            <span className="ws-label" style={{ color: wsStatus === 'connected' ? '#22c55e' : '#eab308', fontSize: '11px', fontWeight: '700' }}>
              {wsStatus === 'connected' ? 'LIVE' : 'CONNECTING'}
            </span>
          </div>

          <div style={s.userBadge}>
            <span>👤</span>
            <strong style={{ color: '#f1f5f9' }}>{user.username}</strong>
            <span style={s.rolePill}>{user.role}</span>
          </div>

          <button onClick={handleLogout} style={s.logoutBtn}>Sign Out</button>
        </div>
      </header>

      {/* ── Error Banner ───────────────────────────────────────────────────── */}
      {error && (
        <div style={s.errorBanner}>
          ⚠️ {error}
          <button onClick={() => setError('')} style={s.dismissBtn}>✕</button>
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div style={s.tabs} className="tabs-pad">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setTab(tab.id)} style={{
            ...s.tab,
            background:   activeTab === tab.id ? '#0f172a' : 'transparent',
            color:        activeTab === tab.id ? '#f1f5f9' : '#64748b',
            borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
          }}>
            {tab.label}
            {tab.badge != null && <span style={s.tabBadge}>{tab.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <main style={s.main} className="main-pad">
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in">
            <StatsBar stats={stats} loading={loading} />
            <TrafficChart stats={stats} timeline={timeline} />
            <AlertsPanel
              alerts={alerts} loading={loading}
              onResolve={handleResolve} onClearResolved={handleClearResolved}
            />
            <LogsTable logs={logs} loading={loading} onRefresh={() => loadAll(true)} />
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="animate-fade-in">
            <VulnTestRunner onRefresh={() => loadAll(true)} />
            <AlertsPanel
              alerts={alerts.filter((a) => a.type === 'VULNERABILITY')}
              loading={loading}
              onResolve={handleResolve}
              title="🛡️ Vulnerability Alerts"
            />
          </div>
        )}

        {activeTab === 'simulator' && (
          <div className="animate-fade-in">
            <TrafficSimulator onRefresh={() => loadAll(true)} />
          </div>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer style={s.footer}>
        API Security Testing & Abuse Detection Platform · UPES MCA Cybersecurity · Tarun Kukreti · Om Uniyal · Shivam Sharma · April 2026
      </footer>
    </div>
  );
}

const s = {
  root:       { minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' },
  header:     { background: '#1e293b', borderBottom: '1px solid #334155', padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  h1:         { fontSize: '18px', fontWeight: '800', color: '#f1f5f9', margin: 0 },
  headerSub:  { fontSize: '11px', color: '#64748b', margin: 0 },
  headerRight:{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  lastUpdated:{ fontSize: '12px', color: '#475569', whiteSpace: 'nowrap' },
  wsPill:     { display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', border: '1px solid' },
  wsDot:      { width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0 },
  userBadge:  { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#94a3b8' },
  rolePill:   { background: '#1e3a5f', color: '#60a5fa', padding: '1px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600' },
  logoutBtn:  { background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' },
  errorBanner:{ background: '#450a0a', color: '#fca5a5', padding: '10px 32px', fontSize: '13px', borderBottom: '1px solid #ef4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  dismissBtn: { background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '16px', padding: '0 4px' },
  tabs:       { display: 'flex', padding: '0 32px', background: '#1e293b', borderBottom: '1px solid #334155', overflowX: 'auto' },
  tab:        { padding: '12px 20px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' },
  tabBadge:   { background: '#ef4444', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: '700' },
  main:       { maxWidth: '1400px', margin: '0 auto', padding: '28px 32px' },
  footer:     { textAlign: 'center', padding: '20px 32px', color: '#334155', fontSize: '12px', borderTop: '1px solid #1e293b' },
};
