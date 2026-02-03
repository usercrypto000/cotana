import "dotenv/config";
import pino from "pino";
import { prisma } from "../services/prisma";
import { redis, ensureRedis, closeRedis } from "../services/redisLite";
import { getWalletType } from "../services/walletType";
import { isApprovalOnlyFromTopics, extractUserFromLogHeuristic } from "../services/mindshare_helpers";

const logger = pino();
const BATCH = Number(process.env.MINDSHARE_CONSUMER_BATCH ?? "200");
const DAILY_CAP = Number(process.env.MINDSHARE_DAILY_CAP ?? 3);

if (process.env.MINDSHARE_ENABLE_WEBHOOKS !== "true") {
  logger.info("mindshare webhook consumer disabled (MINDSHARE_ENABLE_WEBHOOKS!=true)");
  process.exit(0);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function popJobs(batch: number) {
  const res = [];
  for (let i = 0; i < batch; i++) {
    const item = await redis.lpop("mindshare:webhook:jobs");
    if (!item) break;
    try {
      res.push(JSON.parse(item));
    } catch {
      /* ignore bad json */
    }
  }
  return res;
}

async function upsertRawInteraction(data: {
  chainId: number;
  protocolId: number;
  wallet: string;
  txHash: string;
  blockTime: Date;
  day: Date;
  source: string;
  actionCount: number;
  rawJson?: any;
}) {
  const { chainId, protocolId, wallet, txHash, blockTime, day, source, actionCount, rawJson } = data;
  const key = `mindshare:daily:${protocolId}:${wallet}:${day.toISOString().slice(0, 10)}`;
  const current = Number((await redis.get(key)) || 0);
  const allowed = Math.max(0, DAILY_CAP - current);
  const toCount = Math.min(allowed, actionCount);
  const wt = await getWalletType(chainId, wallet).catch(() => "EOA");

  if (toCount > 0) {
    await redis.incrby(key, toCount);
    await redis.expire(key, 60 * 60 * 24 * 3);
  }

  await prisma.rawInteraction.upsert({
    where: { chainId_protocolId_wallet_txHash: { chainId, protocolId, wallet, txHash } },
    update: { actionCount: { increment: toCount || actionCount }, rawJson, walletType: wt, source },
    create: { chainId, protocolId, wallet, txHash, blockTime, day, source, actionCount: toCount || actionCount, walletType: wt, rawJson },
  });
}

async function processBatch(jobs: any[]) {
  if (jobs.length === 0) return;

  const contracts = await prisma.protocolContract.findMany();
  const contractMap = new Map<string, { protocolId: number; chainId: number }>();
  for (const c of contracts) {
    contractMap.set(`${c.chainId}:${c.address.toLowerCase()}`, { protocolId: c.protocolId, chainId: c.chainId });
  }

  for (const job of jobs) {
    if (job.kind === "tx") {
      const key = `${job.chainId}:${(job.to || "").toLowerCase()}`;
      const info = contractMap.get(key);
      if (!info) continue;
      const blockTime = new Date(job.timestamp * 1000);
      const day = new Date(blockTime.toISOString().slice(0, 10));
      await upsertRawInteraction({
        chainId: info.chainId,
        protocolId: info.protocolId,
        wallet: (job.from || "").toLowerCase(),
        txHash: job.hash,
        blockTime,
        day,
        source: "direct",
        actionCount: 1,
        rawJson: job,
      });
    } else if (job.kind === "log") {
      const key = `${job.chainId}:${(job.address || "").toLowerCase()}`;
      const info = contractMap.get(key);
      if (!info) continue;
      if (isApprovalOnlyFromTopics([{ topics: job.topics }])) continue;
      const blockTime = new Date(job.timestamp * 1000);
      const day = new Date(blockTime.toISOString().slice(0, 10));
      const wallet =
        extractUserFromLogHeuristic(job.topics as string[] | null, job.data, ["from", "to", "owner", "user", "account"]) ||
        (job.txHash ? "" : "");
      if (!wallet) continue;
      await upsertRawInteraction({
        chainId: info.chainId,
        protocolId: info.protocolId,
        wallet: wallet.toLowerCase(),
        txHash: job.txHash || "0x",
        blockTime,
        day,
        source: "event",
        actionCount: 1,
        rawJson: job,
      });
    }
  }
}

async function main() {
  await ensureRedis();
  logger.info("starting webhook consumer");
  while (true) {
    const batch = await popJobs(BATCH);
    if (batch.length === 0) {
      await sleep(500);
      continue;
    }
    await processBatch(batch);
  }
}

main()
  .catch(async (e) => {
    logger.error({ err: e }, "consumer failed");
    await prisma.$disconnect();
    await closeRedis();
    process.exit(1);
  });
