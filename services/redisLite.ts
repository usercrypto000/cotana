import Redis from "ioredis";

type SimpleValue = { value: string; expiresAt?: number };

class InMemoryRedis {
  private store = new Map<string, SimpleValue>();

  async get(key: string): Promise<string | null> {
    const v = this.store.get(key);
    if (!v) return null;
    if (v.expiresAt && Date.now() > v.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return v.value;
  }

  async set(key: string, value: string, mode?: "EX" | "NX", durationSec?: number, mode2?: string, duration2?: number) {
    let ttl: number | undefined;
    let nx = false;
    if (mode === "EX" && typeof durationSec === "number") ttl = durationSec;
    if (mode === "NX") nx = true;
    if (mode === "NX" && mode2 === "EX" && typeof duration2 === "number") ttl = duration2;
    if (nx && this.store.has(key)) return null;
    const expiresAt = ttl ? Date.now() + ttl * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  async incrby(key: string, amount: number) {
    const cur = Number(await this.get(key)) || 0;
    const next = cur + amount;
    this.store.set(key, { value: String(next) });
    return next;
  }

  async expire(key: string, seconds: number) {
    const v = this.store.get(key);
    if (!v) return 0;
    v.expiresAt = Date.now() + seconds * 1000;
    this.store.set(key, v);
    return 1;
  }

  async del(key: string) {
    return this.store.delete(key);
  }

  async quit() {
    this.store.clear();
  }
}

const useFake = process.env.REDIS_FAKE === "true";
const redisUrl = process.env.REDIS_URL;

export const redis = useFake
  ? (new InMemoryRedis() as unknown as Redis)
  : redisUrl
    ? new Redis(redisUrl, { lazyConnect: true })
    : new Redis({
        host: process.env.REDIS_HOST ?? "127.0.0.1",
        port: Number(process.env.REDIS_PORT ?? 6379),
        lazyConnect: true,
      });

export async function ensureRedis() {
  if (!useFake) {
    const status = (redis as any).status;
    if (status === "wait" || status === "end" || status === "close") {
      await (redis as any).connect();
    }
  }
}

export async function closeRedis() {
  if (!useFake && (redis as any).status !== "end") {
    await redis.quit();
  }
}
