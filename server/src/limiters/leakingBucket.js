/**
 * Leaking Bucket Algorithm
 *
 * Requests enter a fixed-capacity queue (bucket).
 * Requests "leak" out (are processed) at a constant rate regardless of burst.
 * If the queue is full, new requests are dropped (429).
 *
 * This smooths out bursty traffic into a constant output rate.
 */

import { getRedisClient, isRedisReady, getMemoryStore } from '../config/redis.js';

const LEAKING_BUCKET_SCRIPT = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local leakRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local data = redis.call('HMGET', key, 'queue', 'lastLeak')
local queue = tonumber(data[1]) or 0
local lastLeak = tonumber(data[2]) or now

-- Calculate how many have leaked since last check
local elapsed = math.max(0, now - lastLeak)
local leaked = math.floor(elapsed * leakRate / 1000)
queue = math.max(0, queue - leaked)
lastLeak = now

local allowed = 0
local remaining = capacity - queue

if queue < capacity then
  queue = queue + 1
  allowed = 1
  remaining = capacity - queue
end

local ttl = math.ceil(capacity / leakRate * 1000) + 5000
redis.call('HMSET', key, 'queue', queue, 'lastLeak', lastLeak)
redis.call('PEXPIRE', key, ttl)

local nextLeakMs = math.ceil(1000 / leakRate)
return { allowed, remaining, capacity, queue, nextLeakMs }
`;

export async function leakingBucket(clientKey, options = {}) {
  const {
    capacity = 10,
    leakRate = 1, // requests per second
  } = options;

  const now = Date.now();

  if (isRedisReady()) {
    return await leakingBucketRedis(clientKey, capacity, leakRate, now);
  } else {
    return leakingBucketMemory(clientKey, capacity, leakRate, now);
  }
}

async function leakingBucketRedis(key, capacity, leakRate, now) {
  const redis = getRedisClient();
  const result = await redis.eval(
    LEAKING_BUCKET_SCRIPT,
    1,
    `lb:${key}`,
    capacity,
    leakRate,
    now
  );

  const [allowed, remaining, limit, queueSize, nextLeakMs] = result;
  return {
    allowed: allowed === 1,
    remaining: Math.max(0, parseInt(remaining)),
    limit: parseInt(limit),
    resetAt: new Date(now + parseInt(nextLeakMs)),
    retryAfter: Math.ceil(parseInt(nextLeakMs) / 1000),
    algorithm: 'leaking_bucket',
    state: {
      queueSize: parseInt(queueSize),
      capacity: parseInt(limit),
      leakRate,
      queuePercent: Math.round((parseInt(queueSize) / parseInt(limit)) * 100),
    },
  };
}

function leakingBucketMemory(key, capacity, leakRate, now) {
  const store = getMemoryStore();
  const storeKey = `lb:${key}`;
  let bucket = store.get(storeKey) || { queue: 0, lastLeak: now };

  // Leak requests since last check
  const elapsed = Math.max(0, now - bucket.lastLeak);
  const leaked = Math.floor((elapsed * leakRate) / 1000);
  bucket.queue = Math.max(0, bucket.queue - leaked);
  bucket.lastLeak = now;

  const allowed = bucket.queue < capacity;
  if (allowed) {
    bucket.queue += 1;
  }

  store.set(storeKey, bucket);

  const nextLeakMs = Math.ceil(1000 / leakRate);

  return {
    allowed,
    remaining: Math.max(0, capacity - bucket.queue),
    limit: capacity,
    resetAt: new Date(now + nextLeakMs),
    retryAfter: allowed ? 0 : Math.ceil(nextLeakMs / 1000),
    algorithm: 'leaking_bucket',
    state: {
      queueSize: bucket.queue,
      capacity,
      leakRate,
      queuePercent: Math.round((bucket.queue / capacity) * 100),
    },
  };
}
