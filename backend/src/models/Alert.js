const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type:        { type: String, enum: ['ANOMALY', 'VULNERABILITY'], required: true },
  severity:    { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
  description: { type: String, required: true },
  source_ip:   { type: String, required: true },
  endpoint:    { type: String, required: true },
  rule:        { type: String },
  resolved:    { type: Boolean, default: false, index: true },
  resolved_at: { type: Date, default: null },
  created_at:  { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model('Alert', alertSchema);
