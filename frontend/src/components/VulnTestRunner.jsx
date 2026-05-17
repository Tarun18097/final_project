import { useState } from 'react';
import { runVulnTest, fetchTestResults } from '../api/api';

const TESTS = [
  { id: 'SQL_INJECTION',        label: 'SQL Injection',    icon: '💉', desc: 'OWASP API1/API8 — Tests for DB error leakage via crafted payloads' },
  { id: 'XSS_REFLECTION',       label: 'XSS Reflection',  icon: '🖥️', desc: 'OWASP API8 — Checks if user input is reflected in response' },
  { id: 'RATE_LIMIT_ENFORCEMENT',label: 'Rate Limiting',   icon: '⏱️', desc: 'OWASP API4 — Sends 25 rapid requests to check for 429 enforcement' },
  { id: 'AUTH_BYPASS',          label: 'Auth Bypass',      icon: '🔓', desc: 'OWASP API2 — Tests endpoint with malformed/missing auth tokens' },
  { id: 'SECURITY_HEADERS',     label: 'Security Headers', icon: '🛡️', desc: 'OWASP API7 — Checks for missing HTTP security headers' },
];

const RESULT_STYLE = {
  VULNERABLE:   { bg: '#450a0a', text: '#fca5a5', border: '#ef4444', icon: '🔴' },
  SAFE:         { bg: '#052e16', text: '#86efac', border: '#22c55e', icon: '✅' },
  SUSPICIOUS:   { bg: '#431407', text: '#fdba74', border: '#f97316', icon: '⚠️' },
  INCONCLUSIVE: { bg: '#1e293b', text: '#94a3b8', border: '#475569', icon: '❓' },
  REVIEW_NEEDED:{ bg: '#422006', text: '#fde68a', border: '#f59e0b', icon: '🔍' },
};

export default function VulnTestRunner({ onRefresh }) {
  const [url, setUrl]             = useState('');
  const [selected, setSelected]   = useState(TESTS.map((t) => t.id));
  const [running, setRunning]     = useState(false);
  const [result, setResult]       = useState(null);
  const [history, setHistory]     = useState([]);
  const [error, setError]         = useState('');
  const [progress, setProgress]   = useState('');

  function toggle(id) {
    setSelected((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  }

  async function handleRun() {
    if (!url.trim()) { setError('Enter a target URL first'); return; }
    if (!url.startsWith('http')) { setError('URL must start with http:// or https://'); return; }
    if (selected.length === 0) { setError('Select at least one test'); return; }
    setError(''); setRunning(true); setResult(null);
    setProgress(`Running ${selected.length} test(s) against ${url}…`);
    try {
      const data = await runVulnTest(url.trim(), selected);
      setResult(data.result);
      setHistory((prev) => [data.result, ...prev].slice(0, 8));
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false); setProgress('');
    }
  }

  const overall = result ? (RESULT_STYLE[result.overall_status] || RESULT_STYLE.INCONCLUSIVE) : null;

  return (
    <div style={s.container}>
      <h2 style={s.title}>🛡️ Vulnerability Test Engine</h2>
      <p style={s.sub}>Run real OWASP API Security Top 10 tests against any live HTTP endpoint.</p>

      {/* URL Input */}
      <div style={s.inputRow}>
        <input style={s.input} type="url" value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder="https://target-api.example.com/api/users"
          onKeyDown={(e) => e.key === 'Enter' && handleRun()} />
        <button style={{ ...s.runBtn, opacity: running ? 0.6 : 1, cursor: running ? 'not-allowed' : 'pointer' }}
          onClick={handleRun} disabled={running}>
          {running ? '⏳ Testing…' : '▶ Run Tests'}
        </button>
      </div>

      {/* Test Selection */}
      <div style={s.testGrid}>
        {TESTS.map((t) => {
          const active = selected.includes(t.id);
          return (
            <div key={t.id} onClick={() => toggle(t.id)} style={{ ...s.chip,
              background: active ? '#1e3a5f' : '#0f172a', border: `1px solid ${active ? '#3b82f6' : '#334155'}`, cursor: 'pointer' }}>
              <span style={{ fontSize: '20px' }}>{t.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: active ? '#60a5fa' : '#94a3b8' }}>{t.label}</div>
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{t.desc}</div>
              </div>
              <span style={{ color: active ? '#3b82f6' : '#334155', fontSize: '18px' }}>{active ? '☑' : '☐'}</span>
            </div>
          );
        })}
      </div>

      {progress && <div style={s.progress}>⏳ {progress}</div>}
      {error    && <div style={s.error}>⚠️ {error}</div>}

      {/* Results */}
      {result && (
        <div style={{ ...s.resultsBox, background: overall.bg, border: `1px solid ${overall.border}` }}>
          <div style={s.overallRow}>
            <span style={{ fontSize: '28px' }}>{overall.icon}</span>
            <div>
              <div style={{ fontSize: '17px', fontWeight: '700', color: overall.text }}>
                Overall: {result.overall_status.replace(/_/g, ' ')}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Target: {result.target_url}</div>
            </div>
          </div>

          <div style={s.testList}>
            {result.tests.map((t) => {
              const st = RESULT_STYLE[t.result] || RESULT_STYLE.INCONCLUSIVE;
              return (
                <div key={t.test_type} style={{ ...s.testCard, borderLeft: `3px solid ${st.border}` }}>
                  <div style={s.testCardHeader}>
                    <span style={{ fontWeight: '700', color: '#e2e8f0', fontSize: '13px' }}>{t.test_type.replace(/_/g, ' ')}</span>
                    <span style={{ color: st.text, fontSize: '12px', fontWeight: '700' }}>{st.icon} {t.result}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '6px 0 0' }}>{t.details}</p>
                  {/* Show findings detail */}
                  {t.findings && Array.isArray(t.findings) && (
                    <details style={{ marginTop: '8px' }}>
                      <summary style={{ fontSize: '11px', color: '#475569', cursor: 'pointer' }}>View findings ({t.findings.length})</summary>
                      <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {t.findings.slice(0, 8).map((f, i) => (
                          <div key={i} style={{ fontFamily: 'monospace', fontSize: '11px', color: f.vulnerable || f.reflected || f.suspicious ? '#fca5a5' : '#64748b',
                            background: '#0f172a', padding: '4px 8px', borderRadius: '4px' }}>
                            {f.label || f.payload?.slice(0, 30) || `Test ${i+1}`} → {f.status || 'error'} {f.vulnerable ? '⚠ VULN' : f.reflected ? '⚠ REFLECTED' : f.suspicious ? '⚠ SUSPICIOUS' : '✓'}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 1 && (
        <div style={s.history}>
          <div style={s.historyTitle}>📋 Recent scan history</div>
          {history.slice(1).map((h, i) => {
            const st = RESULT_STYLE[h.overall_status] || RESULT_STYLE.INCONCLUSIVE;
            return (
              <div key={i} style={s.historyRow}>
                <span style={{ color: st.text, fontSize: '12px' }}>{st.icon} {h.overall_status.replace(/_/g, ' ')}</span>
                <span style={{ color: '#475569', fontSize: '11px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>{h.target_url}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s = {
  container: { background: '#1e293b', borderRadius: '12px', padding: '24px', marginBottom: '24px' },
  title: { fontSize: '18px', fontWeight: '700', color: '#f1f5f9', margin: '0 0 6px' },
  sub: { color: '#64748b', fontSize: '13px', margin: '0 0 20px' },
  inputRow: { display: 'flex', gap: '10px', marginBottom: '16px' },
  input: { flex: 1, background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '11px 14px', color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace', outline: 'none' },
  runBtn: { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', padding: '11px 24px', fontWeight: '700', fontSize: '14px', whiteSpace: 'nowrap' },
  testGrid: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' },
  chip: { display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', borderRadius: '8px', userSelect: 'none', transition: 'all 0.15s' },
  progress: { background: '#1e3a5f', color: '#60a5fa', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' },
  error: { background: '#450a0a', color: '#fca5a5', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' },
  resultsBox: { borderRadius: '10px', padding: '18px', marginBottom: '16px' },
  overallRow: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' },
  testList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  testCard: { background: '#0f172a', borderRadius: '6px', padding: '12px 14px' },
  testCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  history: { borderTop: '1px solid #334155', paddingTop: '14px', marginTop: '4px' },
  historyTitle: { fontSize: '12px', color: '#475569', fontWeight: '600', marginBottom: '8px' },
  historyRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #1e293b' },
};
