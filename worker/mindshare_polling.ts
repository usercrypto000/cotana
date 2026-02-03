import pino from "pino";
import { prisma } from "../services/prisma";
import { ensureRedis, redis } from "../services/redisLite";

const logger = pino();

const CHAIN_ID = Number(process.env.MINDSHARE_CHAIN_ID ?? 1);
const RPC = process.env.ALCHEMY_ETH_RPC_URL as string | undefined;
if (!RPC) {
  logger.error("missing ALCHEMY_ETH_RPC_URL env var");
  process.exit(1);
}

const BATCH = Number(process.env.MINDSHARE_POLL_BATCH ?? 100);
const SLEEP_MS = Number(process.env.MINDSHARE_POLL_INTERVAL_MS ?? 5000);

function hex(n: number | bigint) {
  return `0x${n.toString(16)}`;
}

async function rpc(method: string, params: any[]) {
  const body = { jsonrpc: "2.0", id: 1, method, params };
  const res = await fetch(RPC as string, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(`rpc ${method} failed ${res.status}`);
  const j = await res.json();
  if (j.error) throw new Error(JSON.stringify(j.error));
  return j.result;
}

async function getHead() {
  const bn = await rpc("eth_blockNumber", []);
  return BigInt(bn);
}

async function getBlock(blockNumber: bigint) {
  return await rpc("eth_getBlockByNumber", [hex(blockNumber), true]);
}

async function getCode(address: string) {
  return await rpc("eth_getCode", [address, "latest"]);
}

async function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function ensureCursor(chainId: number) {
  let cur = await prisma.mindshareCursor.findUnique({ where: { chainId } as any }).catch(() => null);
  if (!cur) {
    cur = await prisma.mindshareCursor.create({ data: { chainId, lastProcessedBlock: BigInt(0) } });
  }
  return cur;
}

async function updateCursor(chainId: number, blockNumber: bigint) {
  await prisma.mindshareCursor.upsert({
    where: { chainId } as any,
    create: { chainId, lastProcessedBlock: blockNumber },
    update: { lastProcessedBlock: blockNumber },
  });
}

async function isContractCached(chainId: number, address: string) {
  const row = await prisma.addressContractCache.findUnique({ where: { chainId_address: { chainId, address } as any } as any }).catch(() => null);
  return row;
}

async function setContractCache(chainId: number, address: string, isContract: boolean) {
  await prisma.addressContractCache.upsert({
    where: { chainId_address: { chainId, address } as any } as any,
    create: { chainId, address, isContract },
    update: { isContract },
  });
}

async function recordInteraction(chainId: number, address: string, wallet: string, txHash: string, blockNumber: bigint, blockTimeSec: number) {
  const exists = await prisma.addressInteraction.findFirst({ where: { chainId, txHash } }).catch(() => null);
  if (exists) return;
  await prisma.addressInteraction.create({
    data: {
      chainId,
      address,
      wallet,
      txHash,
      blockNumber,
      blockTime: new Date(blockTimeSec * 1000),
    },
  });

  // add wallet to Redis HyperLogLog for 24h and 7d windows to estimate uniques
  try {
    await ensureRedis();
    const key24 = `mindshare:hll:24h:${chainId}:${address}`;
    const key7d = `mindshare:hll:7d:${chainId}:${address}`;
    await (redis as any).pfadd(key24, wallet);
    await (redis as any).pfadd(key7d, wallet);
    // set expiries: 25 hours and 8 days
    await (redis as any).expire(key24, 60 * 60 * 25);
    await (redis as any).expire(key7d, 60 * 60 * 24 * 8);
  } catch (e) {
    // ignore redis errors
  }
}

async function processBatch() {
  const cursor = await ensureCursor(CHAIN_ID);
  let last = BigInt(cursor.lastProcessedBlock || BigInt(0));
  const head = await getHead();
  if (head <= last) return;

  const to = head;
  const maxTo = last + BigInt(BATCH);
  const finalTo = to > maxTo ? maxTo : to;

  logger.info({ last: String(last), head: String(head), finalTo: String(finalTo) }, "processing blocks");

  for (let bn = last + BigInt(1); bn <= finalTo; bn = bn + BigInt(1)) {
    try {
      const block = await getBlock(bn);
      const ts = Number(block.timestamp ?? 0);
      if (Array.isArray(block.transactions)) {
        for (const tx of block.transactions) {
          const toAddr = tx.to;
          if (!toAddr) continue;
          const toLower = (toAddr as string).toLowerCase();
          const fromAddr = (tx.from || "").toLowerCase();

          // check contract cache
          let cache = await prisma.addressContractCache.findUnique({ where: { chainId_address: { chainId: CHAIN_ID, address: toLower } as any } as any }).catch(() => null);
          if (!cache) {
            let code = "0x";
            try {
              code = await getCode(toLower);
            } catch (e) {
              logger.warn({ err: e, address: toLower }, "getCode failed");
            }
            const isContract = code && code !== "0x";
            await setContractCache(CHAIN_ID, toLower, Boolean(isContract));
            cache = { isContract } as any;
          }
          const cacheIsContract = (cache as any)?.isContract;
          if (!cacheIsContract) continue;

          await recordInteraction(CHAIN_ID, toLower, fromAddr, tx.hash as string, bn, ts);
        }
      }
      // advance cursor per-block
      await updateCursor(CHAIN_ID, bn);
      last = bn;
    } catch (e) {
      logger.error({ err: e, block: String(bn) }, "failed processing block");
      break;
    }
  }
}

async function main() {
  logger.info("starting mindshare polling worker");
  while (true) {
    try {
      await processBatch();
    } catch (e) {
      logger.error({ err: e }, "poll loop error");
    }
    await sleep(SLEEP_MS);
  }
}

if (require.main === module) {
  main().catch((e) => {
    logger.error({ err: e }, "worker failed");
    process.exit(1);
  });
}

export { processBatch };
