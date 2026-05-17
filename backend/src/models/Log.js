const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  ip_address:       { type: String, required: true },
  method:           { type: String, required: true },
  endpoint:         { type: String, required: true },
  status_code:      { type: Number, required: true },
  response_time_ms: { type: Number, default: 0 },
  user_agent:       { type: String, default: 'unknown' },
  flagged:          { type: Boolean, default: false },
  timestamp:        { type: Date, default: Date.now },
}, { timestamps: false });

// Indexes — defined only here, NOT via index:true on fields above
logSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // TTL 90 days
logSchema.index({ ip_address: 1 });
logSchema.index({ endpoint: 1 });
logSchema.index({ status_code: 1 });
logSchema.index({ flagged: 1 });

module.exports = mongoose.model('Log', logSchema);