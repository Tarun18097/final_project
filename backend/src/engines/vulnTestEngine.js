const https = require('https');
const http = require('http');
const { URL } = require('url');
const TestResult = require('../models/TestResult');
const Alert = require('../models/Alert');

const SQL_PAYLOADS = [
  "' OR '1'='1",
  "'; DROP TABLE users; --",
  "1 UNION SELECT null,null,null --",
  "' OR 1=1 --",
  "admin'--",
];

const XSS_PAYLOADS = [
  "<script>alert(1)</script>",
  '"><img src=x onerror=alert(1)>',
  "javascript:alert(1)",
];

function sendRequest({ url, method = 'GET', headers = {}, body = null, timeout = 10000 }) {
  return new Promise((resolve, reject) => {
    let parsedUrl;
    try { parsedUrl = new URL(url); } catch { return reject(new Error(`Invalid URL: ${url}`)); }
    const lib = parsedUrl.protocol === 'https:' ? https : http;
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'API-Security-Scanner/1.0 (UPES Research)',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
        ...headers,
      },
      // Allow self-signed certs in test env
      rejectUnauthorized: false,
    };
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error('Request timed out after ' + timeout + 'ms')); });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── Test 1: SQL Injection ─────────────────────────────────────────────────────
async function testSQLInjection(targetUrl) {
  const findings = [];
  for (const payload of SQL_PAYLOADS) {
    try {
      const testUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}id=${encodeURIComponent(payload)}`;
      const { status, body } = await sendRequest({ url: testUrl });
      const b = body.toLowerCase();
      const vulnerable =
        b.includes('sql') || b.includes('syntax error') || b.includes('mysql') ||
        b.includes('sqlite') || b.includes('ora-') || b.includes('postgresql') ||
        b.includes('unclosed quotation') || status === 500;
      findings.push({ payload, status, vulnerable, reason: vulnerable ? `Status ${status} — DB error signature detected in response` : `Status ${status} — No SQL error leakage` });
    } catch (err) {
      findings.push({ payload, status: null, vulnerable: false, reason: `Request error: ${err.message}` });
    }
  }
  const isVulnerable = findings.some((f) => f.vulnerable);
  return {
    test_type: 'SQL_INJECTION',
    result: isVulnerable ? 'VULNERABLE' : 'SAFE',
    details: isVulnerable
      ? 'Endpoint leaks DB error messages — likely vulnerable to SQL injection'
      : 'No SQL error signatures detected in response body',
    findings,
  };
}

// ── Test 2: XSS Reflection ───────────────────────────────────────────────────
async function testXSS(targetUrl) {
  const findings = [];
  for (const payload of XSS_PAYLOADS) {
    try {
      const testUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}q=${encodeURIComponent(payload)}`;
      const { status, body } = await sendRequest({ url: testUrl });
      const reflected = body.includes(payload) || body.includes('<script>');
      findings.push({ payload, status, reflected, reason: reflected ? 'Payload reflected in response — XSS risk' : 'Payload not reflected' });
    } catch (err) {
      findings.push({ payload, status: null, reflected: false, reason: err.message });
    }
  }
  const isVulnerable = findings.some((f) => f.reflected);
  return {
    test_type: 'XSS_REFLECTION',
    result: isVulnerable ? 'VULNERABLE' : 'SAFE',
    details: isVulnerable ? 'Endpoint reflects user input — potential XSS vulnerability (OWASP API8)' : 'No XSS reflection detected',
    findings,
  };
}

// ── Test 3: Rate Limit Enforcement ────────────────────────────────────────────
async function testRateLimiting(targetUrl) {
  const REQUEST_COUNT = 25;
  const results = [];
  // Send in small batches to avoid overwhelming target
  for (let i = 0; i < REQUEST_COUNT; i += 5) {
    const batch = Array.from({ length: Math.min(5, REQUEST_COUNT - i) }, () =>
      sendRequest({ url: targetUrl, timeout: 5000 }).catch(() => ({ status: null }))
    );
    const batchResults = await Promise.all(batch);
    results.push(...batchResults.map((r) => r.status));
    await new Promise((r) => setTimeout(r, 100));
  }
  const got429 = results.some((s) => s === 429);
  const got503 = results.some((s) => s === 503);
  const allSuccess = results.filter(Boolean).every((s) => s < 400);
  return {
    test_type: 'RATE_LIMIT_ENFORCEMENT',
    result: got429 || got503 ? 'SAFE' : allSuccess ? 'VULNERABLE' : 'INCONCLUSIVE',
    details: got429
      ? `Rate limiting enforced — received 429 after rapid requests`
      : got503
      ? 'Server returned 503 under load — rate limiting or overload protection active'
      : allSuccess
      ? `All ${REQUEST_COUNT} rapid requests returned success — rate limiting may be absent (OWASP API4)`
      : 'Mixed responses — manual review recommended',
    findings: { request_count: REQUEST_COUNT, status_codes: results },
  };
}

// ── Test 4: Auth Bypass ───────────────────────────────────────────────────────
async function testAuthBypass(targetUrl) {
  const tests = [
    { label: 'No Authorization header', headers: {} },
    { label: 'Malformed Bearer token', headers: { Authorization: 'Bearer this.is.invalid' } },
    { label: 'Empty Bearer token', headers: { Authorization: 'Bearer ' } },
    { label: 'Basic auth empty', headers: { Authorization: 'Basic ' } },
    { label: 'Null token', headers: { Authorization: 'null' } },
  ];
  const findings = [];
  for (const t of tests) {
    try {
      const { status } = await sendRequest({ url: targetUrl, headers: t.headers });
      findings.push({ label: t.label, status, suspicious: status === 200 || status === 201 });
    } catch (err) {
      findings.push({ label: t.label, status: null, suspicious: false, reason: err.message });
    }
  }
  const likelyVulnerable = findings.filter((f) => f.suspicious).length >= 2;
  const suspicious = findings.some((f) => f.suspicious);
  return {
    test_type: 'AUTH_BYPASS',
    result: likelyVulnerable ? 'VULNERABLE' : suspicious ? 'SUSPICIOUS' : 'SAFE',
    details: likelyVulnerable
      ? 'Multiple unauthenticated requests returned 200 — endpoint likely has no auth (OWASP API2)'
      : suspicious
      ? 'Some unauthenticated requests succeeded — verify if auth is required for this endpoint'
      : 'Endpoint correctly rejected all unauthenticated requests',
    findings,
  };
}

// ── Test 5: Security Headers ─────────────────────────────────────────────────
async function testSecurityHeaders(targetUrl) {
  const REQUIRED_HEADERS = [
    { name: 'x-content-type-options', expected: 'nosniff' },
    { name: 'x-frame-options', expected: null },
    { name: 'strict-transport-security', expected: null },
    { name: 'content-security-policy', expected: null },
    { name: 'x-xss-protection', expected: null },
  ];
  let responseHeaders = {};
  let status = null;
  try {
    const res = await sendRequest({ url: targetUrl });
    responseHeaders = res.headers;
    status = res.status;
  } catch (err) {
    return { test_type: 'SECURITY_HEADERS', result: 'INCONCLUSIVE', details: `Could not reach endpoint: ${err.message}`, findings: [] };
  }

  const findings = REQUIRED_HEADERS.map(({ name, expected }) => {
    const val = responseHeaders[name];
    const present = !!val;
    const correct = expected ? (val || '').toLowerCase().includes(expected) : present;
    return { header: name, present, value: val || null, ok: correct, note: correct ? 'Present' : `Missing — recommended security header` };
  });

  const missing = findings.filter((f) => !f.ok).length;
  return {
    test_type: 'SECURITY_HEADERS',
    result: missing === 0 ? 'SAFE' : missing <= 2 ? 'SUSPICIOUS' : 'VULNERABLE',
    details: missing === 0
      ? 'All recommended security headers are present'
      : `${missing} security header(s) missing — increases attack surface (OWASP API7)`,
    findings,
  };
}

// ── Master runner ─────────────────────────────────────────────────────────────
async function runTests(targetUrl, selectedTests, io) {
  const ALL = {
    SQL_INJECTION: testSQLInjection,
    XSS_REFLECTION: testXSS,
    RATE_LIMIT_ENFORCEMENT: testRateLimiting,
    AUTH_BYPASS: testAuthBypass,
    SECURITY_HEADERS: testSecurityHeaders,
  };

  const toRun = selectedTests && selectedTests.length > 0
    ? selectedTests.filter((t) => ALL[t])
    : Object.keys(ALL);

  const results = [];
  for (const testName of toRun) {
    const testFn = ALL[testName];
    const r = await testFn(targetUrl);
    results.push(r);
    // Save each result to MongoDB
    await TestResult.create({ target_url: targetUrl, ...r });
    // Create alert if vulnerable
    if (r.result === 'VULNERABLE' || r.result === 'SUSPICIOUS') {
      const alert = await Alert.create({
        type: 'VULNERABILITY',
        severity: r.result === 'VULNERABLE' ? 'HIGH' : 'MEDIUM',
        description: `[VulnTest] ${r.test_type} on ${targetUrl}: ${r.details}`,
        source_ip: 'VulnScanner',
        endpoint: targetUrl,
        rule: r.test_type,
      });
      if (io) io.emit('new_alert', alert);
    }
  }

  const overallStatus =
    results.some((r) => r.result === 'VULNERABLE') ? 'VULNERABLE' :
    results.some((r) => r.result === 'SUSPICIOUS') ? 'REVIEW_NEEDED' :
    results.some((r) => r.result === 'INCONCLUSIVE') ? 'REVIEW_NEEDED' : 'SAFE';

  return { target_url: targetUrl, overall_status: overallStatus, tests: results };
}

module.exports = { runTests };
