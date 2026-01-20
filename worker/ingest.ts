import { Queue, Worker } from "bullmq";
import { listChains } from "@/services/chainConfig";
import { getChainHead, getLastProcessedBlock, ingestRange } from "@/services/ingest/ingest";

const connection = {
  connection: {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
  },
};

const queue = new Queue("ingest", connection);

new Worker(
  "ingest",
  async (job) => {
    const { chainId, fromBlock, toBlock } = job.data as {
      chainId: number;
      fromBlock: string;
      toBlock: string;
    };

    await ingestRange({
      chainId,
      fromBlock: BigInt(fromBlock),
      toBlock: BigInt(toBlock),
    });
  },
  connection
);

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

  await queue.add("ingest-range", {
    chainId: chain.id,
    fromBlock: fromArg,
    toBlock: toArg,
  });
}

async function runLive() {
  const chains = listChains();

  while (true) {
    for (const chain of chains) {
      const head = await getChainHead(chain.id);
      const target = head - BigInt(chain.confirmations);
      const last = await getLastProcessedBlock(chain.id);
      if (target <= last) continue;

      await queue.add("ingest-range", {
        chainId: chain.id,
        fromBlock: (last + 1n).toString(),
        toBlock: target.toString(),
      });
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
