import { Queue, Worker } from "bullmq";
import { updateWalletPnL, updateWalletPositions, updateWalletScores } from "@/services/analytics";
import { logger } from "@/services/logger";

const connection = {
  connection: {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
  },
};

export const analyticsQueue = new Queue("analytics", connection);

new Worker(
  "analytics",
  async (job) => {
    const { chainId, fromBlock, toBlock } = job.data as {
      chainId: number;
      fromBlock: string;
      toBlock: string;
    };

    logger.info({ chainId, fromBlock, toBlock }, "analytics job start");
    await updateWalletPositions(chainId, BigInt(fromBlock), BigInt(toBlock));
    await updateWalletPnL(chainId);
    await updateWalletScores(chainId);
    logger.info({ chainId, fromBlock, toBlock }, "analytics job complete");
  },
  connection
);
