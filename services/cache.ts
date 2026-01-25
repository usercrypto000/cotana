import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL ?? "";
const disableRedis =
  process.env.DISABLE_REDIS === "1" ||
  (process.env.VERCEL === "1" &&
    (redisUrl.includes("127.0.0.1") || redisUrl.includes("localhost")));
const redisEnabled = !!redisUrl && !disableRedis;

const client = redisEnabled
  ? new Redis(redisUrl, { lazyConnect: true })
  : null;

export async function getCachedJson<T>(key: string): Promise<T | null> {
  if (!client) return null;
  const value = await client.get(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function setCachedJson(key: string, value: unknown, ttlSeconds: number) {
  if (!client) return;
  await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
}
