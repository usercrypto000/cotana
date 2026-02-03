import { createPublicClient, http, keccak256, toBytes } from "viem";
import pino from "pino";
import { prisma } from "../services/prisma";
import { extractUserFromLogHeuristic, isApprovalOnlyFromTopics } from "../services/mindshare_helpers";
import { getWalletType } from "../services/walletType";
import { getChainConfig, resolveRpcUrl } from "../services/chainConfig";
import { redis, ensureRedis, closeRedis } from "../services/redisLite";

const logger = pino();

const DAILY_CAP = Number(process.env.MINDSHARE_DAILY_CAP ?? 3);
const BATCH_BLOCKS = Number(process.env.MINDSHARE_BLOCK_BATCH ?? 500);
const LOOKBACK_BLOCKS = Number(process.env.MINDSHARE_LOOKBACK_BLOCKS ?? 5000);

const clientCache = new Map<number, ReturnType<typeof createPublicClient>>();

function getClient(chainId: number) {
  const existing = clientCache.get(chainId);
  if (existing) return existing;
  const chain = getChainConfig(chainId);
  if (!chain) return null;
  const rpcUrl = resolveRpcUrl(chain);
  if (!rpcUrl) return null;
  const client = createPublicClient({ transport: http(rpcUrl) });
  clientCache.set(chainId, client);
  return client;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>, retries = 5, delayMs = 500): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < retries) await sleep(delayMs);
    }
  }
  throw lastErr;
}

function normalizeEventTopic(sig: string) {
  if (sig.startsWith("0x") && sig.length === 66) return sig.toLowerCase();
  return keccak256(toBytes(sig));
}

async function upsertRawInteraction({
  chainId,
  protocolId,
  wallet,
  txHash,
  blockTime,
  day,
  source,
  actionCount,
  walletType,
  rawJson,
}: {
  chainId: number;
  protocolId: number;
  wallet: string;
  txHash: string;
  blockTime: Date;
  day: Date;
  source: string;
  actionCount: number;
  walletType?: string;
  rawJson?: any;
}) {
  const dayKey = day.toISOString().slice(0, 10);
  const key = `mindshare:daily:${protocolId}:${wallet}:${dayKey}`;
  const current = await redis.get(key);
  const cap = Number(current || 0);
  const allowed = Math.max(0, DAILY_CAP - cap);
  const toCount = Math.min(allowed, actionCount);

  const wt = walletType ?? (await getWalletType(chainId, wallet).catch(() => "EOA"));

  if (toCount <= 0) {
    await prisma.rawInteraction
      .upsert({
        where: { chainId_protocolId_wallet_txHash: { chainId, protocolId, wallet, txHash } },
        update: { actionCount: { increment: actionCount }, rawJson, walletType: wt, source },
        create: { chainId, protocolId, wallet, txHash, blockTime, day, source, actionCount, walletType: wt, rawJson },
      })
      .catch((e) => logger.error({ err: e }, "upsert raw interaction failed"));
    return { inserted: 0, capped: true };
  }

  await redis.incrby(key, toCount);
  await redis.expire(key, 60 * 60 * 24 * 3);

  await prisma.rawInteraction
    .upsert({
      where: { chainId_protocolId_wallet_txHash: { chainId, protocolId, wallet, txHash } },
      update: { actionCount: { increment: toCount }, rawJson, walletType: wt, source },
      create: { chainId, protocolId, wallet, txHash, blockTime, day, source, actionCount: toCount, walletType: wt, rawJson },
    })
    .catch((e) => logger.error({ err: e }, "upsert raw interaction failed"));

  return { inserted: toCount, capped: toCount < actionCount };
}

async function processEventMaps() {
  if (process.env.MINDSHARE_SKIP_EVENTS === "true") {
    logger.info("MINDSHARE_SKIP_EVENTS=true, skipping event map ingestion");
    return;
  }
  const maps = await prisma.protocolEventMap.findMany({ where: { isMeaningful: true } });
  if (maps.length === 0) return;
  logger.info({ maps: maps.length }, "event maps");

  const byChain = new Map<number, typeof maps>();
  for (const m of maps) {
    const list = byChain.get(m.chainId) ?? [];
    list.push(m);
    byChain.set(m.chainId, list);
  }

  for (const [chainId, chainMaps] of byChain) {
    const chain = getChainConfig(chainId);
    const client = getClient(chainId);
    if (!chain || !client) {
      logger.warn({ chainId }, "skip event maps, missing chain config or rpc");
      continue;
    }
    const latest = Number(await withRetry(() => client.getBlockNumber()));
    const confirmations = chain.confirmations ?? 0;
    const safeHead = Math.max(0, latest - confirmations);
    const defaultStart = Math.max(0, safeHead - LOOKBACK_BLOCKS);

    for (const map of chainMaps) {
      const cursorKey = `mindshare:logs:last:${chainId}:${map.id}`;
      const last = Number(await redis.get(cursorKey));
      let fromBlock = Number.isFinite(last) && last > 0 ? last + 1 : defaultStart;
      if (fromBlock > safeHead) continue;

      const topic0 = normalizeEventTopic(map.eventSig);
      while (fromBlock <= safeHead) {
        const toBlock = Math.min(fromBlock + BATCH_BLOCKS - 1, safeHead);
        let logs: any[] = [];
        try {
          logs = await client.getLogs({
            address: map.contractAddress as `0x${string}`,
            fromBlock: BigInt(fromBlock),
            toBlock: BigInt(toBlock),
            topics: [topic0],
          } as any);
        } catch (e) {
          logger.warn({ err: e, chainId, mapId: map.id }, "getLogs failed");
          await sleep(500);
          break;
        }

        const blockCache = new Map<bigint, Date>();
        for (const log of logs) {
          const blockNumber = log.blockNumber as bigint;
          let blockTime = blockCache.get(blockNumber);
          if (!blockTime) {
            const block = await client.getBlock({ blockNumber });
            blockTime = new Date(Number(block.timestamp) * 1000);
            blockCache.set(blockNumber, blockTime);
          }

          const inferred = extractUserFromLogHeuristic(
            Array.isArray(log.topics) ? (log.topics as string[]) : null,
            typeof log.data === "string" ? log.data : null,
            Array.isArray(map.userFieldPathsJson) ? (map.userFieldPathsJson as string[]) : []
          );

          let wallet = inferred;
          if (!wallet) {
            try {
              const tx = await client.getTransaction({ hash: log.transactionHash });
              wallet = tx.from?.toLowerCase() ?? null;
            } catch (e) {
              logger.debug({ err: e, tx: log.transactionHash }, "tx lookup failed");
            }
          }

          if (!wallet) continue;

          await upsertRawInteraction({
            chainId,
            protocolId: map.protocolId,
            wallet: wallet.toLowerCase(),
            txHash: log.transactionHash,
            blockTime,
            day: new Date(blockTime.toISOString().slice(0, 10)),
            source: "event",
            actionCount: 1,
            rawJson: { logIndex: log.logIndex, eventSig: map.eventSig },
          });
        }

        await redis.set(cursorKey, String(toBlock));
        fromBlock = toBlock + 1;
        await sleep(200);
      }
    }
  }
}

async function processDirectTxs() {
  const contracts = await prisma.protocolContract.findMany();
  if (contracts.length === 0) return;

  const byChain = new Map<number, Map<string, number>>();
  for (const c of contracts) {
    const chainMap = byChain.get(c.chainId) ?? new Map<string, number>();
    chainMap.set(c.address.toLowerCase(), c.protocolId);
    byChain.set(c.chainId, chainMap);
  }

  for (const [chainId, contractMap] of byChain) {
    const chain = getChainConfig(chainId);
    const client = getClient(chainId);
    if (!chain || !client) {
      logger.warn({ chainId }, "skip direct txs, missing chain config or rpc");
      continue;
    }
    const latest = Number(await withRetry(() => client.getBlockNumber()));
    const confirmations = chain.confirmations ?? 0;
    const safeHead = Math.max(0, latest - confirmations);
    const fromBlock = Math.max(0, safeHead - LOOKBACK_BLOCKS);

    const addresses = Array.from(contractMap.keys());
    const chunkSize = 20;
    const txSeen = new Map<string, { protocolId: number; address: string; blockNum: number }>();

    for (let i = 0; i < addresses.length; i += chunkSize) {
      const chunk = addresses.slice(i, i + chunkSize);
      const params: any = {
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: `0x${safeHead.toString(16)}`,
        toAddress: chunk,
        category: ["external"],
        withMetadata: false,
        maxCount: "0x3e8",
      };
      let pageKey: string | undefined = undefined;
      let pageCount = 0;
      do {
        const body = pageKey ? { ...params, pageKey } : params;
        const res: any = await withRetry(
          () =>
            (client as any).request({
              method: "alchemy_getAssetTransfers",
              params: [body],
            }),
          3,
          300
        );
        const transfers = res?.transfers ?? [];
        for (const t of transfers) {
          if (!t.to || !t.hash || !t.blockNum) continue;
          const addr = (t.to as string).toLowerCase();
          const protocolId = contractMap.get(addr);
          if (!protocolId) continue;
          txSeen.set(t.hash as string, { protocolId, address: addr, blockNum: parseInt(t.blockNum, 16) });
        }
        pageKey = res?.pageKey;
        pageCount += 1;
      } while (pageKey && pageCount < 1); // limit pages per chunk to stay fast
    }

    logger.info({ chainId, txCount: txSeen.size }, "direct txs discovered from transfers");

    for (const [txHash, meta] of txSeen) {
      try {
        const tx = await withRetry(() => client.getTransaction({ hash: txHash as `0x${string}` }), 2, 200);
        if (!tx || !tx.from) continue;
        const block = await withRetry(() => client.getBlock({ blockNumber: BigInt(meta.blockNum) }), 2, 200);
        const blockTime = new Date(Number(block.timestamp) * 1000);

        await upsertRawInteraction({
          chainId,
          protocolId: meta.protocolId,
          wallet: tx.from.toLowerCase(),
          txHash,
          blockTime,
          day: new Date(blockTime.toISOString().slice(0, 10)),
          source: "direct",
          actionCount: 1,
        });
      } catch (e) {
        logger.debug({ err: e, txHash }, "direct tx processing failed");
      }
    }
  }
}

async function main() {
  logger.info("starting mindshare ingest worker");
  await ensureRedis();
  const lock = await (redis as any).set(
    "mindshare:ingest:lock",
    "1",
    "NX",
    "EX",
    55 * 60
  );
  if (!lock) {
    logger.info("ingest already running, skipping");
    return;
  }
  if (process.env.MINDSHARE_SKIP_RPC === "true") {
    logger.warn("MINDSHARE_SKIP_RPC=true, skipping ingest (dev no-op)");
    await closeRedis();
    return;
  }
  try {
    await processEventMaps();
    await processDirectTxs();
    logger.info("done ingest run");
  } catch (e) {
    logger.error({ err: e }, "worker run failed");
  } finally {
    await prisma.$disconnect();
    await closeRedis();
  }
}

if (require.main === module) {
  main();
}

export { upsertRawInteraction };
