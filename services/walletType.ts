import pino from "pino";
import { createPublicClient, http } from "viem";
import { getChainConfig, resolveRpcUrl } from "./chainConfig";
import { redis, ensureRedis } from "./redisLite";

const logger = pino();

const CACHE_TTL = Number(process.env.WALLET_TYPE_TTL_SEC ?? 60 * 60 * 24 * 7); // 7 days

const clientCache = new Map<number, ReturnType<typeof createPublicClient>>();

function getClient(chainId: number) {
  const cached = clientCache.get(chainId);
  if (cached) return cached;
  const chain = getChainConfig(chainId);
  if (!chain) throw new Error(`unknown chain ${chainId}`);
  const rpc = resolveRpcUrl(chain);
  if (!rpc) throw new Error(`no RPC url for chain ${chainId}`);
  const client = createPublicClient({ transport: http(rpc) });
  clientCache.set(chainId, client);
  return client;
}

export async function getWalletType(chainId: number, address: string): Promise<"EOA" | "CONTRACT"> {
  const key = `wallet:type:${chainId}:${address.toLowerCase()}`;
  try {
    await ensureRedis();
    const cached = await redis.get(key);
    if (cached) return cached as "EOA" | "CONTRACT";
  } catch (e) {
    logger.debug({ err: e }, "redis get failed");
  }

  try {
    const client = getClient(chainId);
    const code = await client.getCode({ address: address as `0x${string}` });
    const isContract = code && code !== "0x" && code !== "0x0";
    const value = isContract ? "CONTRACT" : "EOA";
    await redis.set(key, value, "EX", CACHE_TTL);
    return value;
  } catch (e) {
    logger.warn({ err: e, address }, "getCode failed, defaulting to EOA");
    return "EOA";
  }
}

export async function closeWalletType() {
  await redis.quit();
}
