/**
 * Token Bucket Algorithm
 *
 * Each client gets a "bucket" with a maximum capacity of tokens.
 * Tokens are added at a fixed refill rate (tokens per second).
 * Each request consumes one token. If the bucket is empty, the request is rejected.
 *
 * Supports both Redis (atomic Lua script) and in-memory fallback.
 */

import { getRedisClient, isRedisReady, getMemoryStore } from '../config/redis.js';

// Lua script for atomic Redis operation (no race conditions)
const TOKEN_BUCKET_SCRIPT = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local data = redis.call('HMGET', key, 'tokens', 'lastRefill')
local tokens = tonumber(data[1])
local lastRefill = tonumber(data[2])

if tokens == nil then
  tokens = capacity
  lastRefill = now
end

-- Refill tokens based on elapsed time
local elapsed = math.max(0, now - lastRefill)
local refilled = math.floor(elapsed * refillRate / 1000)
tokens = math.min(capacity, tokens + refilled)

local allowed = 0
local remaining = tokens

if tokens >= requested then
  tokens = tokens - requested
  remaining = tokens
  allowed = 1
end

redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
redis.call('PEXPIRE', key, math.ceil(capacity / refillRate * 1000) + 5000)

return { allowed, remaining, capacity, math.ceil((capacity - tokens) / refillRate * 1000) }
`;

export async function tokenBucket(clientKey, options = {}) {
  const {
    capacity = 10,
    refillRate = 1, // tokens per second
    requested = 1,
  } = options;

  const now = Date.now();

  if (isRedisReady()) {
    return await tokenBucketRedis(clientKey, capacity, refillRate, now, requested);
  } else {
    return tokenBucketMemory(clientKey, capacity, refillRate, now, requested);
  }
}

async function tokenBucketRedis(key, capacity, refillRate, now, requested) {
  const redis = getRedisClient();
  const result = await redis.eval(
    TOKEN_BUCKET_SCRIPT,
    1,
    `tb:${key}`,
    capacity,
    refillRate,
    now,
    requested
  );

  const [allowed, remaining, limit, retryAfterMs] = result;
  return {
    allowed: allowed === 1,
    remaining: parseInt(remaining),
    limit: parseInt(limit),
    resetAt: new Date(now + parseInt(retryAfterMs)),
    retryAfter: Math.ceil(parseInt(retryAfterMs) / 1000),
    algorithm: 'token_bucket',
    // Visualization state
    state: {
      tokens: parseInt(remaining),
      capacity: parseInt(limit),
      fillPercent: Math.round((parseInt(remaining) / parseInt(limit)) * 100),
    },
  };
}

function tokenBucketMemory(key, capacity, refillRate, now, requested) {
  const store = getMemoryStore();
  const storeKey = `tb:${key}`;
  let bucket = store.get(storeKey);

  if (!bucket) {
    bucket = { tokens: capacity, lastRefill: now };
  }

  // Refill tokens based on elapsed time
  const elapsed = Math.max(0, now - bucket.lastRefill);
  const refilled = Math.floor((elapsed * refillRate) / 1000);
  bucket.tokens = Math.min(capacity, bucket.tokens + refilled);
  bucket.lastRefill = now;

  const allowed = bucket.tokens >= requested;
  if (allowed) {
    bucket.tokens -= requested;
  }

  store.set(storeKey, bucket);

  const retryAfterMs = allowed ? 0 : Math.ceil(((requested - bucket.tokens) / refillRate) * 1000);

  return {
    allowed,
    remaining: bucket.tokens,
    limit: capacity,
    resetAt: new Date(now + retryAfterMs),
    retryAfter: Math.ceil(retryAfterMs / 1000),
    algorithm: 'token_bucket',
    state: {
      tokens: bucket.tokens,
      capacity,
      fillPercent: Math.round((bucket.tokens / capacity) * 100),
    },
  };
}
