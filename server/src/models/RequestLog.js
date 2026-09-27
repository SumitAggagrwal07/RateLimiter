import mongoose from 'mongoose';

const RequestLogSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  clientIp: {
    type: String,
    required: true,
    index: true,
  },
  endpoint: {
    type: String,
    required: true,
  },
  method: {
    type: String,
    default: 'GET',
  },
  statusCode: {
    type: Number,
    required: true,
    index: true,
  },
  algorithm: {
    type: String,
    enum: ['token_bucket', 'leaking_bucket', 'fixed_window', 'sliding_window'],
    required: true,
    index: true,
  },
  latencyMs: {
    type: Number,
    default: 0,
  },
  allowed: {
    type: Boolean,
    required: true,
    index: true,
  },
  remaining: {
    type: Number,
    default: 0,
  },
  limit: {
    type: Number,
    default: 0,
  },
  resetAt: {
    type: Date,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: false,
  collection: 'request_logs',
});

// Compound index for efficient filtering
RequestLogSchema.index({ algorithm: 1, timestamp: -1 });
RequestLogSchema.index({ allowed: 1, timestamp: -1 });
RequestLogSchema.index({ clientIp: 1, timestamp: -1 });

// TTL index — auto-expire logs older than 24 hours
RequestLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 86400 });

const RequestLog = mongoose.model('RequestLog', RequestLogSchema);

export default RequestLog;
