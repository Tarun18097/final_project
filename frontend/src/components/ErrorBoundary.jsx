import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={s.root}>
        <div style={s.card}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h1 style={s.title}>Something went wrong</h1>
          <p style={s.msg}>{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <button style={s.btn} onClick={() => window.location.reload()}>
            🔄 Reload Page
          </button>
        </div>
      </div>
    );
  }
}

const s = {
  root:  { minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' },
  card:  { background: '#1e293b', borderRadius: '16px', padding: '48px', maxWidth: '480px', width: '100%', textAlign: 'center', border: '1px solid #334155' },
  title: { fontSize: '22px', fontWeight: '700', color: '#f1f5f9', marginBottom: '12px' },
  msg:   { color: '#94a3b8', fontSize: '14px', marginBottom: '28px', fontFamily: 'monospace', background: '#0f172a', padding: '12px', borderRadius: '8px', textAlign: 'left' },
  btn:   { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 28px', fontWeight: '700', fontSize: '15px', cursor: 'pointer' },
};
