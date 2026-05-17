const SEV = {
  CRITICAL: { bg: '#450a0a', text: '#fca5a5', border: '#ef4444' },
  HIGH:     { bg: '#431407', text: '#fdba74', border: '#f97316' },
  MEDIUM:   { bg: '#422006', text: '#fde68a', border: '#f59e0b' },
  LOW:      { bg: '#052e16', text: '#86efac', border: '#22c55e' },
};
const TYPE_ICON = { ANOMALY: '🔴', VULNERABILITY: '🛡️' };

export default function AlertsPanel({ alerts = [], loading, onResolve, onClearResolved, title = '🚨 Active Alerts' }) {
  const active   = alerts.filter((a) => !a.resolved);
  const resolved = alerts.filter((a) => a.resolved);

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h2 style={s.title}>
          {title}
          {active.length > 0 && <span style={s.badge}>{active.length}</span>}
        </h2>
        {resolved.length > 0 && onClearResolved && (
          <button style={s.clearBtn} onClick={onClearResolved}>🗑️ Clear {resolved.length} resolved</button>
        )}
      </div>

      {loading && <p style={s.muted}>Loading alerts…</p>}

      {!loading && active.length === 0 && (
        <div style={s.empty}>
          <span style={{ fontSize: '32px' }}>✅</span>
          <p>No active alerts — system looks clean</p>
        </div>
      )}

      <div style={s.list}>
        {active.map((alert) => {
          const c = SEV[alert.severity] || SEV.LOW;
          return (
            <div key={alert._id} style={{ ...s.card, background: c.bg, borderLeft: `4px solid ${c.border}` }}>
              <div style={s.cardTop}>
                <div style={s.meta}>
                  <span>{TYPE_ICON[alert.type] || '⚠️'}</span>
                  <span style={{ ...s.sevBadge, color: c.text, background: c.border + '33' }}>{alert.severity}</span>
                  <span style={s.typePill}>{alert.type}</span>
                  {alert.rule && <span style={s.rulePill}>{alert.rule.replace(/_/g, ' ')}</span>}
                </div>
                <button style={s.resolveBtn} onClick={() => onResolve(alert._id)}>✓ Resolve</button>
              </div>
              <p style={{ ...s.desc, color: c.text }}>{alert.description}</p>
              <div style={s.footer}>
                <span>🖥️ {alert.source_ip}</span>
                <span>📍 {alert.endpoint}</span>
                <span>🕐 {new Date(alert.created_at).toLocaleTimeString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Collapsed resolved section */}
      {resolved.length > 0 && (
        <details style={s.resolvedSection}>
          <summary style={s.resolvedSummary}>✅ {resolved.length} resolved alerts</summary>
          <div style={{ ...s.list, marginTop: '10px', opacity: 0.6 }}>
            {resolved.slice(0, 10).map((alert) => {
              const c = SEV[alert.severity] || SEV.LOW;
              return (
                <div key={alert._id} style={{ ...s.card, background: '#0f172a', borderLeft: `4px solid ${c.border}55`, fontSize: '12px' }}>
                  <div style={s.meta}>
                    <span style={s.sevBadge}>{alert.severity}</span>
                    <span style={{ color: '#64748b' }}>{alert.description}</span>
                  </div>
                  <div style={{ ...s.footer, marginTop: '4px' }}>
                    <span>🖥️ {alert.source_ip}</span>
                    <span>✅ Resolved {new Date(alert.resolved_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}

const s = {
  container: { background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  title: { fontSize: '18px', fontWeight: '700', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 },
  badge: { background: '#ef4444', color: '#fff', borderRadius: '20px', padding: '2px 10px', fontSize: '13px', fontWeight: '700' },
  clearBtn: { background: 'transparent', border: '1px solid #334155', color: '#64748b', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  card: { borderRadius: '8px', padding: '14px 16px' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  meta: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  sevBadge: { padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' },
  typePill: { background: '#334155', color: '#94a3b8', padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '600' },
  rulePill: { background: '#1e3a5f', color: '#60a5fa', padding: '2px 8px', borderRadius: '8px', fontSize: '11px' },
  resolveBtn: { background: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' },
  desc: { fontSize: '13px', lineHeight: '1.5', marginBottom: '10px', margin: '0 0 10px' },
  footer: { display: 'flex', gap: '16px', fontSize: '12px', color: '#64748b', flexWrap: 'wrap' },
  muted: { color: '#64748b', fontSize: '14px' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '32px', color: '#64748b', fontSize: '14px' },
  resolvedSection: { marginTop: '16px', borderTop: '1px solid #334155', paddingTop: '12px' },
  resolvedSummary: { color: '#64748b', fontSize: '13px', cursor: 'pointer', padding: '4px 0' },
};
