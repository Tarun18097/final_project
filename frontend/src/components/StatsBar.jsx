export default function StatsBar({ stats, loading }) {
  const cards = [
    { label: 'Total Requests',   value: stats?.total_requests,              icon: '📡', color: '#3b82f6' },
    { label: 'Requests / Min',   value: stats?.recent_requests_per_minute,  icon: '⚡', color: '#22c55e' },
    { label: 'Error Responses',  value: stats?.error_count,                 icon: '❌', color: '#ef4444' },
    { label: 'Active Alerts',    value: stats?.active_alerts,               icon: '🚨', color: '#f59e0b' },
  ];

  return (
    <div style={s.grid} className="stats-grid">
      {cards.map(({ label, value, icon, color }) => (
        <div key={label} style={{ ...s.card, borderTop: `3px solid ${color}` }} className="animate-fade-in">
          <div style={s.top}>
            <span style={{ fontSize: '26px' }}>{icon}</span>
            <span style={{ ...s.value, color }}>
              {loading || value === undefined
                ? <span style={s.skeleton} />
                : (typeof value === 'number' ? value.toLocaleString() : value)}
            </span>
          </div>
          <div style={s.label}>{label}</div>
        </div>
      ))}
    </div>
  );
}

const s = {
  grid:     { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
  card:     { background: '#1e293b', borderRadius: '12px', padding: '20px 22px' },
  top:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  value:    { fontSize: '30px', fontWeight: '800', letterSpacing: '-1px', lineHeight: 1 },
  label:    { fontSize: '13px', color: '#64748b', fontWeight: '600' },
  skeleton: { display: 'inline-block', background: '#334155', borderRadius: '4px', width: '56px', height: '30px', animation: 'pulse 1.5s infinite' },
};
