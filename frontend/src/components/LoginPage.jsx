import { useState } from 'react';
import { login, register } from '../api/api';

export default function LoginPage({ onLogin }) {
  const [mode, setMode]         = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError('Both fields are required'); return; }
    setError(''); setLoading(true);
    try {
      const fn   = mode === 'login' ? login : register;
      const data = await fn(username.trim(), password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.root}>
      <div style={s.card}>
        {/* Logo */}
        <div style={s.logoRow}>
          <span style={s.logoIcon}>🛡️</span>
          <div>
            <h1 style={s.title}>API Security Platform</h1>
            <p style={s.sub}>Testing & Abuse Detection · UPES MCA</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          {['login', 'register'].map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(''); }}
              style={{ ...s.tab, borderBottom: mode === m ? '2px solid #3b82f6' : '2px solid transparent', color: mode === m ? '#f1f5f9' : '#64748b' }}>
              {m === 'login' ? '🔑 Sign In' : '✏️ Register'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          <label style={s.label}>Username</label>
          <input style={s.input} type="text" value={username} onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. admin" autoFocus autoComplete="username" />

          <label style={s.label}>Password</label>
          <input style={s.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />

          {error && <div style={s.error}>⚠️ {error}</div>}

          <button type="submit" style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? '⏳ Please wait…' : mode === 'login' ? '🔑 Sign In' : '✏️ Create Account'}
          </button>
        </form>

        {mode === 'login' && (
          <div style={s.hint}>
            <span style={{ color: '#475569' }}>Default credentials: </span>
            <code style={s.code}>admin</code> / <code style={s.code}>admin123</code>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  root: {
    minHeight: '100vh', background: '#0f172a',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  card: {
    background: '#1e293b', borderRadius: '16px', padding: '40px',
    width: '100%', maxWidth: '420px', border: '1px solid #334155',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
  },
  logoRow: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' },
  logoIcon: { fontSize: '44px' },
  title: { fontSize: '20px', fontWeight: '800', color: '#f1f5f9', margin: 0 },
  sub: { fontSize: '12px', color: '#64748b', margin: '4px 0 0' },
  tabs: { display: 'flex', marginBottom: '24px', borderBottom: '1px solid #334155' },
  tab: { flex: 1, padding: '10px', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px', transition: 'all 0.2s' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  label: { fontSize: '13px', color: '#94a3b8', fontWeight: '600', marginBottom: '-4px' },
  input: { background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '11px 14px', color: '#e2e8f0', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  error: { background: '#450a0a', color: '#fca5a5', border: '1px solid #ef444444', borderRadius: '8px', padding: '10px 14px', fontSize: '13px' },
  btn: { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', padding: '13px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', marginTop: '4px', transition: 'opacity 0.2s' },
  hint: { marginTop: '16px', fontSize: '12px', textAlign: 'center', color: '#64748b' },
  code: { background: '#0f172a', color: '#7dd3fc', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px' },
};
