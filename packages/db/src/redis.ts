import { logServerEvent, requireRedisEnv } from "@cotana/config/runtime";
import Redis from "ioredis";

type MemoryEntry = {
  value: string;
  expiresAt: number | null;
};

const memoryStore = new Map<string, MemoryEntry>();

let redisClient: Redis | null | undefined;

async function ensureRedisConnection(redis: Redis) {
  if (redis.status === "wait") {
    await redis.connect();
  }
}

function getRedisClient() {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const env = requireRedisEnv();

  if (!env.REDIS_URL) {
    logServerEvent("warn", "Redis is not configured. Falling back to in-memory cache.", {
      scope: "redis",
      environment: env.NODE_ENV
    });
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1
  });

  redisClient.on("error", (error) => {
    logServerEvent("error", "Redis connection error. Falling back to in-memory cache.", {
      scope: "redis",
      error: error.message
    });
    redisClient = null;
  });

  return redisClient;
}

function getMemoryEntry(key: string) {
  const entry = memoryStore.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt && entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }

  return entry;
}

function setMemoryEntry(key: string, value: string, ttlSeconds?: number) {
  memoryStore.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null
  });
}

export async function getCacheValue<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();

  if (redis) {
    try {
      await ensureRedisConnection(redis);
      const value = await redis.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      redisClient = null;
    }
  }

  const memoryEntry = getMemoryEntry(key);
  return memoryEntry ? (JSON.parse(memoryEntry.value) as T) : null;
}

export async function setCacheValue(key: string, value: unknown, ttlSeconds: number) {
  const serialized = JSON.stringify(value);
  const redis = getRedisClient();

  if (redis) {
    try {
      await ensureRedisConnection(redis);
      await redis.set(key, serialized, "EX", ttlSeconds);
      return;
    } catch {
      redisClient = null;
    }
  }

  setMemoryEntry(key, serialized, ttlSeconds);
}

export async function deleteCacheValue(key: string) {
  const redis = getRedisClient();

  if (redis) {
    try {
      await ensureRedisConnection(redis);
      await redis.del(key);
      return;
    } catch {
      redisClient = null;
    }
  }

  memoryStore.delete(key);
}

export async function incrementCounter(key: string, ttlSeconds: number) {
  const redis = getRedisClient();

  if (redis) {
    try {
      await ensureRedisConnection(redis);
      const value = await redis.incr(key);

      if (value === 1) {
        await redis.expire(key, ttlSeconds);
      }

      return value;
    } catch {
      redisClient = null;
    }
  }

  const current = getMemoryEntry(key);
  const nextValue = (current ? Number(current.value) : 0) + 1;
  setMemoryEntry(key, String(nextValue), ttlSeconds);
  return nextValue;
}

export async function getCounterValue(key: string) {
  const redis = getRedisClient();

  if (redis) {
    try {
      await ensureRedisConnection(redis);
      const value = await redis.get(key);
      return value ? Number(value) : null;
    } catch {
      redisClient = null;
    }
  }

  const current = getMemoryEntry(key);
  return current ? Number(current.value) : null;
}

export async function checkRateLimit(key: string, limit: number, windowSeconds: number) {
  const current = await incrementCounter(key, windowSeconds);

  return {
    allowed: current <= limit,
    remaining: Math.max(limit - current, 0),
    resetAt: new Date(Date.now() + windowSeconds * 1000)
  };
}
