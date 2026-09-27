import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

let redisClient = null;
let isRedisAvailable = false;

// In-memory fallback store
const memoryStore = new Map();

function getMemoryStore() {
  return memoryStore;
}

async function initRedis() {
  try {
    const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      lazyConnect: true,
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });

    await client.connect();
    await client.ping();
    redisClient = client;
    isRedisAvailable = true;
    console.log('✅ Redis connected successfully');

    client.on('error', (err) => {
      if (isRedisAvailable) {
        console.warn('⚠️  Redis error, switching to in-memory fallback:', err.message);
        isRedisAvailable = false;
      }
    });

    client.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    client.on('connect', () => {
      isRedisAvailable = true;
      console.log('✅ Redis reconnected');
    });

    return client;
  } catch (err) {
    console.warn('⚠️  Redis unavailable, using in-memory fallback store:', err.message);
    isRedisAvailable = false;
    return null;
  }
}

function getRedisClient() {
  return redisClient;
}

function isRedisReady() {
  return isRedisAvailable && redisClient !== null;
}

export { initRedis, getRedisClient, isRedisReady, getMemoryStore };
