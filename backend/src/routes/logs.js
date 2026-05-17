const express = require('express');
const router  = express.Router();
const Log     = require('../models/Log');
const Alert   = require('../models/Alert');
const { analyzeLog } = require('../engines/anomalyDetection');

const VALID_METHODS = ['GET','POST','PUT','PATCH','DELETE','OPTIONS','HEAD'];

// Sanitize string — strip HTML tags and dangerous chars
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '').replace(/['"`;]/g, '').trim().slice(0, 512);
}

function validateLogEntry(body) {
  const errors = [];
  if (!body.ip_address || typeof body.ip_address !== 'string')
    errors.push('ip_address is required');
  if (!body.method || !VALID_METHODS.includes(String(body.method).toUpperCase()))
    errors.push(`method must be one of: ${VALID_METHODS.join(', ')}`);
  if (!body.endpoint || typeof body.endpoint !== 'string')
    errors.push('endpoint is required');
  if (typeof body.status_code !== 'number' || body.status_code < 100 || body.status_code > 599)
    errors.push('status_code must be a number between 100 and 599');
  return errors;
}

// ── POST /api/logs/ingest ─────────────────────────────────────────────────────
router.post('/ingest', async (req, res) => {
  const errors = validateLogEntry(req.body);
  if (errors.length)
    return res.status(400).json({ success: false, errors });

  try {
    const log = await Log.create({
      ip_address:       sanitize(req.body.ip_address),
      method:           String(req.body.method).toUpperCase(),
      endpoint:         sanitize(req.body.endpoint),
      status_code:      req.body.status_code,
      response_time_ms: typeof req.body.response_time_ms === 'number'
                          ? req.body.response_time_ms
                          : Math.floor(Math.random() * 300 + 20),
      user_agent:       sanitize(req.body.user_agent || 'unknown'),
    });

    const io = req.app.get('io');
    const triggeredAlerts = await analyzeLog(log, io);
    io?.emit('new_log', log);

    return res.status(201).json({
      success: true,
      log,
      alerts_triggered: triggeredAlerts.length,
      alerts: triggeredAlerts,
    });
  } catch (err) {
    console.error('Ingest error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/logs ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
    const page   = Math.max(parseInt(req.query.page) || 1, 1);
    const filter = {};
    if (req.query.ip)      filter.ip_address  = req.query.ip;
    if (req.query.method)  filter.method       = req.query.method.toUpperCase();
    if (req.query.flagged) filter.flagged       = req.query.flagged === 'true';

    const [logs, total] = await Promise.all([
      Log.find(filter).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Log.countDocuments(filter),
    ]);
    return res.json({ success: true, count: logs.length, total, page, pages: Math.ceil(total / limit), logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/logs/stats ───────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const oneMinAgo = new Date(Date.now() - 60 * 1000);

    const [total, recentCount, errorCount, activeAlerts, methodAgg, endpointAgg, topIpsAgg] =
      await Promise.all([
        Log.countDocuments(),
        Log.countDocuments({ timestamp: { $gte: oneMinAgo } }),
        Log.countDocuments({ status_code: { $gte: 400 } }),
        Alert.countDocuments({ resolved: false }),
        Log.aggregate([{ $group: { _id: '$method', count: { $sum: 1 } } }]),
        Log.aggregate([
          { $group: { _id: '$endpoint', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ]),
        Log.aggregate([
          { $group: { _id: '$ip_address', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ]),
      ]);

    const method_breakdown = {};
    methodAgg.forEach((m) => { method_breakdown[m._id] = m.count; });

    return res.json({
      success: true,
      stats: {
        total_requests:              total,
        recent_requests_per_minute:  recentCount,
        error_count:                 errorCount,
        active_alerts:               activeAlerts,
        top_endpoints: endpointAgg.map((e) => ({ endpoint: e._id, count: e.count })),
        top_ips:       topIpsAgg.map((e)   => ({ ip: e._id,       count: e.count })),
        method_breakdown,
      },
    });
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/logs/timeline — per-minute buckets for last 30 min ───────────────
router.get('/timeline', async (req, res) => {
  try {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const agg = await Log.aggregate([
      { $match: { timestamp: { $gte: thirtyMinsAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%H:%M', date: '$timestamp' },
          },
          count:  { $sum: 1 },
          errors: { $sum: { $cond: [{ $gte: ['$status_code', 400] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    return res.json({
      success: true,
      timeline: agg.map((a) => ({ time: a._id, requests: a.count, errors: a.errors })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/logs/top-ips — top IPs by request count ─────────────────────────
router.get('/top-ips', async (req, res) => {
  try {
    const agg = await Log.aggregate([
      { $group: { _id: '$ip_address', count: { $sum: 1 }, errors: { $sum: { $cond: [{ $gte: ['$status_code', 400] }, 1, 0] } } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    return res.json({ success: true, top_ips: agg.map((a) => ({ ip: a._id, count: a.count, errors: a.errors })) });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
