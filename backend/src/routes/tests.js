const express = require('express');
const router = express.Router();
const { runTests } = require('../engines/vulnTestEngine');
const TestResult = require('../models/TestResult');

const AVAILABLE_TESTS = ['SQL_INJECTION', 'XSS_REFLECTION', 'RATE_LIMIT_ENFORCEMENT', 'AUTH_BYPASS', 'SECURITY_HEADERS'];

router.post('/run', async (req, res) => {
  const { target_url, tests } = req.body;
  if (!target_url) return res.status(400).json({ success: false, message: 'target_url is required' });
  try { new URL(target_url); } catch {
    return res.status(400).json({ success: false, message: 'target_url must be a valid URL (include http:// or https://)' });
  }
  const selectedTests = Array.isArray(tests) && tests.length > 0
    ? tests.filter((t) => AVAILABLE_TESTS.includes(t))
    : AVAILABLE_TESTS;

  try {
    const io = req.app.get('io');
    const result = await runTests(target_url, selectedTests, io);
    return res.json({ success: true, result });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Test failed: ${err.message}` });
  }
});

router.get('/results', async (req, res) => {
  try {
    const results = await TestResult.find().sort({ run_at: -1 }).limit(50).lean();
    return res.json({ success: true, count: results.length, results });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
