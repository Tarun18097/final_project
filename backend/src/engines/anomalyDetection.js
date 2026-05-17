const Alert = require('../models/Alert');

const ipWindows = {};
const authFailures = {};

const RULES = {
  RATE_LIMIT_THRESHOLD: parseInt(process.env.RATE_LIMIT_THRESHOLD) || 30,
  BRUTE_FORCE_THRESHOLD: parseInt(process.env.BRUTE_FORCE_THRESHOLD) || 5,
  WINDOW_MS: 60 * 1000,
};

function recordIpRequest(ip) {
  const now = Date.now();
  if (!ipWindows[ip]) ipWindows[ip] = [];
  ipWindows[ip].push(now);
  ipWindows[ip] = ipWindows[ip].filter((t) => now - t < RULES.WINDOW_MS);
  return ipWindows[ip].length;
}

async function analyzeLog(log, io) {
  const { ip_address, status_code, endpoint } = log;
  const created = [];

  const count = recordIpRequest(ip_address);
  if (count === RULES.RATE_LIMIT_THRESHOLD + 1) {
    const alert = await Alert.create({
      type: 'ANOMALY', severity: 'MEDIUM',
      description: `Rate limit exceeded: ${ip_address} sent ${count} requests/min (threshold: ${RULES.RATE_LIMIT_THRESHOLD})`,
      source_ip: ip_address, endpoint, rule: 'RATE_LIMIT_VIOLATION',
    });
    created.push(alert);
    if (io) io.emit('new_alert', alert);
  }

  if (status_code === 401) {
    authFailures[ip_address] = (authFailures[ip_address] || 0) + 1;
    if (authFailures[ip_address] === RULES.BRUTE_FORCE_THRESHOLD) {
      const alert = await Alert.create({
        type: 'ANOMALY', severity: 'HIGH',
        description: `Brute force detected: ${ip_address} has ${authFailures[ip_address]} consecutive auth failures on ${endpoint}`,
        source_ip: ip_address, endpoint, rule: 'BRUTE_FORCE',
      });
      created.push(alert);
      if (io) io.emit('new_alert', alert);
    }
  } else {
    authFailures[ip_address] = 0;
  }

  if (status_code === 403) {
    const alert = await Alert.create({
      type: 'ANOMALY', severity: 'LOW',
      description: `Forbidden access: ${ip_address} attempted ${endpoint} and received 403`,
      source_ip: ip_address, endpoint, rule: 'FORBIDDEN_ACCESS',
    });
    created.push(alert);
    if (io) io.emit('new_alert', alert);
  }

  const sqlPattern = /('|--|;|union\s+select|drop\s+table|insert\s+into|xp_|exec\s*\()/i;
  if (sqlPattern.test(endpoint) || sqlPattern.test(log.user_agent || '')) {
    const alert = await Alert.create({
      type: 'ANOMALY', severity: 'CRITICAL',
      description: `Possible injection attempt detected from ${ip_address} on ${endpoint}`,
      source_ip: ip_address, endpoint, rule: 'INJECTION_ATTEMPT',
    });
    created.push(alert);
    if (io) io.emit('new_alert', alert);
  }

  return created;
}

module.exports = { analyzeLog, getRules: () => ({ ...RULES }) };
