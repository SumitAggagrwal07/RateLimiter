/**
 * Core Rate Limiter Middleware
 * Dispatches to the correct algorithm handler, emits Socket.io events,
 * sets standard HTTP headers, and logs to MongoDB.
 */

import { v4 as uuidv4 } from 'uuid';
import { tokenBucket } from '../limiters/tokenBucket.js';
import { leakingBucket } from '../limiters/leakingBucket.js';
import { fixedWindow } from '../limiters/fixedWindow.js';
import { slidingWindow } from '../limiters/slidingWindow.js';
import RequestLog from '../models/RequestLog.js';
import { isMongoReady } from '../config/database.js';

// Global config store — can be dynamically updated via Socket.io
let globalConfig = {
  algorithm: 'token_bucket',
  capacity: 10,
  refillRate: 2,
  leakRate: 2,
  limit: 10,
  windowMs: 10000,
};

let ioInstance = null;

export function setIo(io) {
  ioInstance = io;
}

export function updateConfig(newConfig) {
  globalConfig = { ...globalConfig, ...newConfig };
  console.log('🔧 Rate limiter config updated:', globalConfig);
}

export function getConfig() {
  return { ...globalConfig };
}

const algorithmMap = {
  token_bucket: (key, cfg) =>
    tokenBucket(key, { capacity: cfg.capacity, refillRate: cfg.refillRate }),
  leaking_bucket: (key, cfg) =>
    leakingBucket(key, { capacity: cfg.capacity, leakRate: cfg.leakRate }),
  fixed_window: (key, cfg) =>
    fixedWindow(key, { limit: cfg.limit, windowMs: cfg.windowMs }),
  sliding_window: (key, cfg) =>
    slidingWindow(key, { limit: cfg.limit, windowMs: cfg.windowMs }),
};

export function createRateLimiter() {
  return async (req, res, next) => {
    const startTime = Date.now();
    const requestId = uuidv4();
    const clientIp =
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const cfg = { ...globalConfig };
    const algorithm = cfg.algorithm;
    const handler = algorithmMap[algorithm];

    if (!handler) {
      return next();
    }

    let result;
    try {
      result = await handler(clientIp, cfg);
    } catch (err) {
      console.error('Rate limiter error:', err);
      return next(); // Fail open
    }

    const latencyMs = Date.now() - startTime;
    const statusCode = result.allowed ? 200 : 429;

    // Set standard rate limit headers
    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining));
    res.setHeader('X-RateLimit-Algorithm', algorithm);
    if (result.resetAt) {
      res.setHeader('X-RateLimit-Reset', Math.floor(result.resetAt.getTime() / 1000));
    }
    if (!result.allowed && result.retryAfter !== undefined) {
      res.setHeader('Retry-After', result.retryAfter);
    }

    // Attach to request for downstream use
    req.rateLimitResult = result;
    req.requestId = requestId;
    req.clientIp = clientIp;
    req.startTime = startTime;

    // Emit real-time socket event
    if (ioInstance) {
      const eventPayload = {
        requestId,
        clientIp,
        endpoint: req.path,
        method: req.method,
        algorithm,
        allowed: result.allowed,
        remaining: result.remaining,
        limit: result.limit,
        latencyMs,
        timestamp: new Date().toISOString(),
        state: result.state,
      };

      ioInstance.emit(result.allowed ? 'request_processed' : 'request_blocked', eventPayload);
      ioInstance.emit('bucket_state_changed', {
        algorithm,
        state: result.state,
        timestamp: Date.now(),
      });
    }

    // Async log to MongoDB (non-blocking)
    if (isMongoReady()) {
      RequestLog.create({
        requestId,
        clientIp,
        endpoint: req.path,
        method: req.method,
        statusCode,
        algorithm,
        latencyMs,
        allowed: result.allowed,
        remaining: result.remaining,
        limit: result.limit,
        resetAt: result.resetAt,
      }).catch((err) => console.warn('Log write failed:', err.message));
    }

    if (!result.allowed) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Algorithm: ${algorithm}`,
        algorithm,
        retryAfter: result.retryAfter,
        limit: result.limit,
        remaining: 0,
        resetAt: result.resetAt,
      });
    }

    next();
  };
}
