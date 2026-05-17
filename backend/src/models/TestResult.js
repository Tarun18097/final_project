const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema({
  target_url:  { type: String, required: true },
  test_type:   { type: String, required: true },
  result:      { type: String, enum: ['VULNERABLE', 'SAFE', 'SUSPICIOUS', 'INCONCLUSIVE'], required: true },
  details:     { type: String },
  findings:    { type: mongoose.Schema.Types.Mixed },
  run_at:      { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model('TestResult', testResultSchema);
