import { Queue, Worker } from "bullmq";
import { listChains } from "@/services/chainConfig";
import { getChainHead, getLastProcessedBlock, ingestRange } from "@/services/ingest/ingest";
import { updateWalletPnL, updateWalletPositions, updateWalletScores } from "@/services/analytics";
import { logger } from "@/services/logger";

const redisEnabled = process.env.DISABLE_REDIS !== "1";
const connection = {
  connection: {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
  },
};

const queue = redisEnabled ? new Queue("ingest", connection) : null;
const analyticsQueue = redisEnabled ? new Queue("analytics", connection) : null;

if (redisEnabled) {
  new Worker(
    "ingest",
    async (job) => {
      const { chainId, fromBlock, toBlock } = job.data as {
        chainId: number;
        fromBlock: string;
        toBlock: string;
      };

      logger.info({ chainId, fromBlock, toBlock }, "ingest job start");
      await ingestRange({
        chainId,
        fromBlock: BigInt(fromBlock),
        toBlock: BigInt(toBlock),
      });

      await analyticsQueue?.add("analytics-range", { chainId, fromBlock, toBlock });
      logger.info({ chainId, fromBlock, toBlock }, "ingest job complete");
    },
    connection
  );
} else {
  logger.warn("Redis disabled; ingest will run inline without BullMQ.");
}

function parseArg(name: string) {
  const index = process.argv.findIndex((value) => value === name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

async function runBackfill() {
  const chainArg = parseArg("--chain");
  const fromArg = parseArg("--fromBlock");
  const toArg = parseArg("--toBlock");

  if (!chainArg || !fromArg || !toArg) {
    throw new Error("Missing --chain, --fromBlock, or --toBlock");
  }

  const chain = listChains().find(
    (item) => item.shortName === chainArg || item.id === Number(chainArg)
  );
  if (!chain) {
    throw new Error(`Unknown chain ${chainArg}`);
  }

  if (queue) {
    await queue.add("ingest-range", {
      chainId: chain.id,
      fromBlock: fromArg,
      toBlock: toArg,
    });
    return;
  }

  logger.info({ chainId: chain.id, fromBlock: fromArg, toBlock: toArg }, "inline backfill start");
  await ingestRange({ chainId: chain.id, fromBlock: BigInt(fromArg), toBlock: BigInt(toArg) });
  await updateWalletPositions(chain.id, BigInt(fromArg), BigInt(toArg));
  await updateWalletPnL(chain.id);
  await updateWalletScores(chain.id);
  logger.info({ chainId: chain.id, fromBlock: fromArg, toBlock: toArg }, "inline backfill complete");
}

async function runLive() {
  const chains = listChains();

  while (true) {
    for (const chain of chains) {
      const head = await getChainHead(chain.id);
      const target = head - BigInt(chain.confirmations);
      const last = await getLastProcessedBlock(chain.id);
      if (target <= last) continue;

      if (queue) {
        await queue.add("ingest-range", {
          chainId: chain.id,
          fromBlock: (last + 1n).toString(),
          toBlock: target.toString(),
        });
      } else {
        const fromBlock = last + 1n;
        const toBlock = target;
        logger.info(
          { chainId: chain.id, fromBlock: fromBlock.toString(), toBlock: toBlock.toString() },
          "inline ingest start"
        );
        await ingestRange({ chainId: chain.id, fromBlock, toBlock });
        await updateWalletPositions(chain.id, fromBlock, toBlock);
        await updateWalletPnL(chain.id);
        await updateWalletScores(chain.id);
        logger.info(
          { chainId: chain.id, fromBlock: fromBlock.toString(), toBlock: toBlock.toString() },
          "inline ingest complete"
        );
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 12_000));
  }
}

const mode = process.argv[2] ?? "live";

if (mode === "backfill") {
  runBackfill().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  runLive().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
