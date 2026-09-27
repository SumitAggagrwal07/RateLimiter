/**
 * Sliding Window Log Algorithm
 *
 * Maintains a sorted set (log) of request timestamps.
 * For each request, removes timestamps older than the window,
 * then counts remaining entries. Allows if count < limit.
 *
 * Eliminates the boundary burst problem of Fixed Window.
 * Memory-intensive but perfectly accurate.
 */

import { getRedisClient, isRedisReady, getMemoryStore } from '../config/redis.js';

const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requestId = ARGV[4]

local windowStart = now - windowMs

-- Remove expired entries
redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

-- Count current requests in window
local count = redis.call('ZCARD', key)

local allowed = 0
local remaining = 0

if count < limit then
  redis.call('ZADD', key, now, requestId)
  count = count + 1
  allowed = 1
  remaining = limit - count
end

redis.call('PEXPIRE', key, windowMs + 1000)

-- Get oldest timestamp for reset info
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
local resetAt = now + windowMs
if #oldest > 0 then
  resetAt = tonumber(oldest[2]) + windowMs
end

return { allowed, remaining, limit, count, resetAt }
`;

export async function slidingWindow(clientKey, options = {}) {
  const {
    limit = 10,
    windowMs = 10000, // 10 seconds
  } = options;

  const now = Date.now();
  const requestId = `${now}-${Math.random().toString(36).substr(2, 9)}`;

  if (isRedisReady()) {
    return await slidingWindowRedis(clientKey, limit, windowMs, now, requestId);
  } else {
    return slidingWindowMemory(clientKey, limit, windowMs, now, requestId);
  }
}

async function slidingWindowRedis(key, limit, windowMs, now, requestId) {
  const redis = getRedisClient();
  const result = await redis.eval(
    SLIDING_WINDOW_SCRIPT,
    1,
    `sw:${key}`,
    limit,
    windowMs,
    now,
    requestId
  );

  const [allowed, remaining, lim, count, resetAt] = result;

  // Get the log entries for visualization
  let logEntries = [];
  try {
    const rawEntries = await redis.zrangebyscore(
      `sw:${key}`,
      now - windowMs,
      now,
      'WITHSCORES'
    );
    for (let i = 0; i < rawEntries.length; i += 2) {
      logEntries.push({
        id: rawEntries[i],
        timestamp: parseInt(rawEntries[i + 1]),
        age: now - parseInt(rawEntries[i + 1]),
      });
    }
  } catch (_) {}

  return {
    allowed: allowed === 1,
    remaining: Math.max(0, parseInt(remaining)),
    limit: parseInt(lim),
    resetAt: new Date(parseInt(resetAt)),
    retryAfter: Math.max(0, Math.ceil((parseInt(resetAt) - now) / 1000)),
    algorithm: 'sliding_window',
    state: {
      count: parseInt(count),
      limit: parseInt(lim),
      windowMs,
      windowStart: now - windowMs,
      windowEnd: now,
      fillPercent: Math.round((parseInt(count) / parseInt(lim)) * 100),
      logEntries: logEntries.slice(-20), // Send last 20 for viz
    },
  };
}

function slidingWindowMemory(key, limit, windowMs, now, requestId) {
  const store = getMemoryStore();
  const storeKey = `sw:${key}`;
  let log = store.get(storeKey) || [];

  const windowStart = now - windowMs;

  // Remove expired entries
  log = log.filter((entry) => entry.timestamp > windowStart);

  const count = log.length;
  const allowed = count < limit;

  if (allowed) {
    log.push({ id: requestId, timestamp: now, age: 0 });
  }

  store.set(storeKey, log);

  const oldest = log[0];
  const resetAt = oldest ? oldest.timestamp + windowMs : now + windowMs;

  return {
    allowed,
    remaining: Math.max(0, limit - log.length),
    limit,
    resetAt: new Date(resetAt),
    retryAfter: Math.max(0, Math.ceil((resetAt - now) / 1000)),
    algorithm: 'sliding_window',
    state: {
      count: log.length,
      limit,
      windowMs,
      windowStart,
      windowEnd: now,
      fillPercent: Math.round((log.length / limit) * 100),
      logEntries: log.slice(-20).map((e) => ({ ...e, age: now - e.timestamp })),
    },
  };
}
