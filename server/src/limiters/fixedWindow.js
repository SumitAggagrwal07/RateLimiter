/**
 * Fixed Window Counter Algorithm
 *
 * Divides time into fixed windows (e.g., 1-second or 1-minute intervals).
 * Counts requests within the current window. Resets counter at window boundary.
 *
 * Simple but susceptible to boundary bursts (2x traffic at window edge).
 */

import { getRedisClient, isRedisReady, getMemoryStore } from '../config/redis.js';

const FIXED_WINDOW_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local windowStart = math.floor(now / windowMs) * windowMs
local windowKey = key .. ':' .. windowStart

local count = redis.call('INCR', windowKey)
if count == 1 then
  redis.call('PEXPIRE', windowKey, windowMs + 1000)
end

local allowed = 0
local remaining = 0

if count <= limit then
  allowed = 1
  remaining = limit - count
end

local resetAt = windowStart + windowMs

return { allowed, remaining, limit, count, resetAt }
`;

export async function fixedWindow(clientKey, options = {}) {
  const {
    limit = 10,
    windowMs = 10000, // 10 seconds
  } = options;

  const now = Date.now();

  if (isRedisReady()) {
    return await fixedWindowRedis(clientKey, limit, windowMs, now);
  } else {
    return fixedWindowMemory(clientKey, limit, windowMs, now);
  }
}

async function fixedWindowRedis(key, limit, windowMs, now) {
  const redis = getRedisClient();
  const result = await redis.eval(
    FIXED_WINDOW_SCRIPT,
    1,
    `fw:${key}`,
    limit,
    windowMs,
    now
  );

  const [allowed, remaining, lim, count, resetAt] = result;
  const resetDate = new Date(parseInt(resetAt));
  const retryAfterMs = parseInt(resetAt) - now;

  return {
    allowed: allowed === 1,
    remaining: Math.max(0, parseInt(remaining)),
    limit: parseInt(lim),
    resetAt: resetDate,
    retryAfter: Math.max(0, Math.ceil(retryAfterMs / 1000)),
    algorithm: 'fixed_window',
    state: {
      count: parseInt(count),
      limit: parseInt(lim),
      windowMs,
      windowStart: Math.floor(now / windowMs) * windowMs,
      windowEnd: Math.floor(now / windowMs) * windowMs + windowMs,
      fillPercent: Math.round((parseInt(count) / parseInt(lim)) * 100),
      timeRemainingMs: parseInt(resetAt) - now,
    },
  };
}

function fixedWindowMemory(key, limit, windowMs, now) {
  const store = getMemoryStore();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const storeKey = `fw:${key}:${windowStart}`;

  let entry = store.get(storeKey) || { count: 0 };
  entry.count += 1;
  store.set(storeKey, entry);

  // Schedule cleanup
  setTimeout(() => store.delete(storeKey), windowMs + 2000);

  const allowed = entry.count <= limit;
  const resetAt = new Date(windowStart + windowMs);
  const retryAfterMs = windowStart + windowMs - now;

  return {
    allowed,
    remaining: Math.max(0, limit - entry.count),
    limit,
    resetAt,
    retryAfter: Math.max(0, Math.ceil(retryAfterMs / 1000)),
    algorithm: 'fixed_window',
    state: {
      count: entry.count,
      limit,
      windowMs,
      windowStart,
      windowEnd: windowStart + windowMs,
      fillPercent: Math.round((entry.count / limit) * 100),
      timeRemainingMs: retryAfterMs,
    },
  };
}
