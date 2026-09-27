import express from 'express';
import RequestLog from '../models/RequestLog.js';
import { isMongoReady } from '../config/database.js';
import { getConfig, updateConfig } from '../middleware/rateLimiter.js';
import { isRedisReady } from '../config/redis.js';

const router = express.Router();

// GET /api/config — return current rate limiter config
router.get('/config', (req, res) => {
  res.json({
    success: true,
    config: getConfig(),
    redis: isRedisReady(),
    mongo: isMongoReady(),
  });
});

// POST /api/config — update rate limiter config
router.post('/config', (req, res) => {
  const {
    algorithm,
    capacity,
    refillRate,
    leakRate,
    limit,
    windowMs,
  } = req.body;

  const validAlgorithms = ['token_bucket', 'leaking_bucket', 'fixed_window', 'sliding_window'];

  if (algorithm && !validAlgorithms.includes(algorithm)) {
    return res.status(400).json({ error: 'Invalid algorithm', valid: validAlgorithms });
  }

  const updates = {};
  if (algorithm) updates.algorithm = algorithm;
  if (capacity !== undefined) updates.capacity = Math.max(1, Math.min(1000, parseInt(capacity)));
  if (refillRate !== undefined) updates.refillRate = Math.max(0.1, Math.min(1000, parseFloat(refillRate)));
  if (leakRate !== undefined) updates.leakRate = Math.max(0.1, Math.min(1000, parseFloat(leakRate)));
  if (limit !== undefined) updates.limit = Math.max(1, Math.min(1000, parseInt(limit)));
  if (windowMs !== undefined) updates.windowMs = Math.max(1000, Math.min(3600000, parseInt(windowMs)));

  updateConfig(updates);

  res.json({ success: true, config: getConfig() });
});

// GET /api/test — test endpoint that goes through rate limiter
router.get('/test', (req, res) => {
  const result = req.rateLimitResult;
  res.json({
    success: true,
    message: 'Request allowed',
    requestId: req.requestId,
    clientIp: req.clientIp,
    rateLimitInfo: {
      algorithm: result?.algorithm,
      remaining: result?.remaining,
      limit: result?.limit,
      resetAt: result?.resetAt,
    },
    timestamp: new Date().toISOString(),
  });
});

// GET /api/logs — paginated MongoDB logs with filters
router.get('/logs', async (req, res) => {
  if (!isMongoReady()) {
    return res.json({
      success: true,
      logs: [],
      total: 0,
      message: 'MongoDB not connected — logs unavailable',
    });
  }

  try {
    const {
      page = 1,
      limit: pageLimit = 50,
      algorithm,
      allowed,
      clientIp,
    } = req.query;

    const filter = {};
    if (algorithm) filter.algorithm = algorithm;
    if (allowed !== undefined) filter.allowed = allowed === 'true';
    if (clientIp) filter.clientIp = clientIp;

    const skip = (parseInt(page) - 1) * parseInt(pageLimit);

    const [logs, total] = await Promise.all([
      RequestLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(pageLimit))
        .lean(),
      RequestLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      logs,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(pageLimit)),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs', message: err.message });
  }
});

// GET /api/stats — aggregate stats
router.get('/stats', async (req, res) => {
  if (!isMongoReady()) {
    return res.json({ success: true, stats: null, message: 'MongoDB not connected' });
  }

  try {
    const stats = await RequestLog.aggregate([
      {
        $facet: {
          overall: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                allowed: { $sum: { $cond: ['$allowed', 1, 0] } },
                blocked: { $sum: { $cond: ['$allowed', 0, 1] } },
                avgLatency: { $avg: '$latencyMs' },
              },
            },
          ],
          byAlgorithm: [
            {
              $group: {
                _id: '$algorithm',
                total: { $sum: 1 },
                allowed: { $sum: { $cond: ['$allowed', 1, 0] } },
                blocked: { $sum: { $cond: ['$allowed', 0, 1] } },
                avgLatency: { $avg: '$latencyMs' },
              },
            },
          ],
          last5Minutes: [
            { $match: { timestamp: { $gte: new Date(Date.now() - 300000) } } },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                allowed: { $sum: { $cond: ['$allowed', 1, 0] } },
                blocked: { $sum: { $cond: ['$allowed', 0, 1] } },
              },
            },
          ],
        },
      },
    ]);

    res.json({ success: true, stats: stats[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute stats', message: err.message });
  }
});

// DELETE /api/logs — clear all logs
router.delete('/logs', async (req, res) => {
  if (!isMongoReady()) {
    return res.json({ success: true, message: 'MongoDB not connected' });
  }
  try {
    const result = await RequestLog.deleteMany({});
    res.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear logs', message: err.message });
  }
});

export default router;
