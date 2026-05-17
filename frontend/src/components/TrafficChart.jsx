import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, CartesianGrid, Legend,
} from 'recharts';

const METHOD_COLORS = {
  GET: '#3b82f6', POST: '#22c55e', PUT: '#f59e0b',
  PATCH: '#a78bfa', DELETE: '#ef4444', OPTIONS: '#64748b', HEAD: '#475569',
};

const TT = {
  contentStyle: { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '12px' },
  cursor: { fill: '#334155', fillOpacity: 0.4 },
};

export default function TrafficChart({ stats, timeline }) {
  const methodData = Object.entries(stats?.method_breakdown || {})
    .map(([method, count]) => ({ method, count, color: METHOD_COLORS[method] || '#64748b' }))
    .sort((a, b) => b.count - a.count);

  const endpointData = (stats?.top_endpoints || [])
    .map((e) => ({ name: e.endpoint.replace('/api/', '/'), count: e.count }));

  const topIpData = (stats?.top_ips || [])
    .map((e) => ({ ip: e.ip, count: e.count, errors: e.errors }));

  const hasTimeline = Array.isArray(timeline) && timeline.length > 0;
  const hasMethods  = methodData.length > 0;
  const hasEndpoints = endpointData.length > 0;
  const hasIps      = topIpData.length > 0;

  if (!hasTimeline && !hasMethods && !hasEndpoints) {
    return (
      <div style={s.emptyBox}>
        <span style={{ fontSize: '36px' }}>📊</span>
        <p style={{ color: '#475569', marginTop: '8px' }}>No traffic data yet — use the Simulator to generate logs</p>
      </div>
    );
  }

  return (
    <div style={s.wrapper} className="chart-grid">

      {/* Timeline — full width */}
      {hasTimeline && (
        <div style={{ ...s.card, gridColumn: 'span 2' }}>
          <h3 style={s.cardTitle}>📈 Request Timeline <span style={s.sub}>last 30 minutes</span></h3>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={timeline} margin={{ left: -10, right: 8, top: 4 }}>
              <defs>
                <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TT.contentStyle} />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
              <Area type="monotone" dataKey="requests" stroke="#3b82f6" fill="url(#reqGrad)" strokeWidth={2} name="Requests" dot={false} />
              <Area type="monotone" dataKey="errors"   stroke="#ef4444" fill="url(#errGrad)" strokeWidth={2} name="Errors"   dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* HTTP Methods Pie */}
      {hasMethods && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>🔧 HTTP Methods</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={methodData} dataKey="count" nameKey="method" cx="50%" cy="50%"
                outerRadius={75} innerRadius={35}
                label={({ method, percent }) => `${method} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}>
                {methodData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={TT.contentStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Endpoints */}
      {hasEndpoints && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>📍 Top Endpoints</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={endpointData} layout="vertical" margin={{ left: 8, right: 16, top: 4 }}>
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip contentStyle={TT.contentStyle} cursor={TT.cursor} />
              <Bar dataKey="count" radius={[0, 5, 5, 0]} fill="#3b82f6" maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top IPs */}
      {hasIps && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>🖥️ Top IPs <span style={s.sub}>by request count</span></h3>
          <div style={s.ipList}>
            {topIpData.map((row, i) => (
              <div key={i} style={s.ipRow}>
                <div style={s.ipLeft}>
                  <span style={s.ipRank}>{i + 1}</span>
                  <span style={s.ipAddr}>{row.ip}</span>
                </div>
                <div style={s.ipRight}>
                  <span style={s.ipCount}>{row.count} reqs</span>
                  {row.errors > 0 && <span style={s.ipErrors}>{row.errors} err</span>}
                </div>
                {/* bar fill */}
                <div style={{ ...s.ipBar, width: `${Math.min((row.count / topIpData[0].count) * 100, 100)}%` }} />
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

const s = {
  wrapper:   { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' },
  card:      { background: '#1e293b', borderRadius: '12px', padding: '20px' },
  cardTitle: { fontSize: '15px', fontWeight: '700', color: '#f1f5f9', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' },
  sub:       { fontSize: '12px', color: '#475569', fontWeight: '400' },
  emptyBox:  { background: '#1e293b', borderRadius: '12px', padding: '40px', textAlign: 'center', marginBottom: '24px' },
  // IP list
  ipList:    { display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' },
  ipRow:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '6px', background: '#0f172a', position: 'relative', overflow: 'hidden' },
  ipLeft:    { display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1 },
  ipRight:   { display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1 },
  ipRank:    { color: '#475569', fontSize: '11px', fontWeight: '700', width: '14px' },
  ipAddr:    { fontFamily: 'monospace', fontSize: '12px', color: '#cbd5e1' },
  ipCount:   { fontSize: '12px', color: '#60a5fa', fontWeight: '700' },
  ipErrors:  { fontSize: '11px', color: '#ef4444', background: '#450a0a', padding: '1px 6px', borderRadius: '8px' },
  ipBar:     { position: 'absolute', left: 0, top: 0, height: '100%', background: '#3b82f611', borderRadius: '6px', transition: 'width 0.5s ease' },
};
