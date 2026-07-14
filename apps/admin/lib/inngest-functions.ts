import { cron, eventType } from "inngest";
import { serve } from "inngest/next";
import { inngest } from "./inngest";
import {
  runCommunityPickRecompute,
  runEmbeddingRefresh,
  runRisingRecompute,
  runTrendingRecompute,
  runWeeklySnapshots,
  startJobStatus,
  finishJobStatus,
  failJobStatus,
  processSignalRefreshChunk
} from "./jobs";
import { listAppsForSignalCategoryPaginated } from "@cotana/db";

// TODO: HARDENED FOR VERCEL PRODUCTION DEPLOYMENT
const buildChunkedSignalRefresh = (jobKey: string, categorySlug: "defi" | "lending-yield" | "prediction-markets") => {
  return inngest.createFunction(
    {
      id: `signals-refresh-${categorySlug}`,
      triggers: [cron("0 */12 * * *")]
    },
    async ({ step }) => {
      let cursorId: string | undefined = undefined;
      let hasMore = true;
      let totalInserted = 0;

      await step.run("mark-job-running", () => startJobStatus(jobKey));

      try {
        while (hasMore) {
          const result: { nextCursor?: string, inserted: number, hasMore: boolean } = await step.run(`process-chunk-${cursorId || "start"}`, async () => {
            const apps = await listAppsForSignalCategoryPaginated(categorySlug, cursorId, 10);
            const inserted = await processSignalRefreshChunk(categorySlug, apps);
            return {
              nextCursor: apps.length === 10 ? apps[9].id : undefined,
              inserted,
              hasMore: apps.length === 10
            };
          });

          cursorId = result.nextCursor;
          hasMore = result.hasMore;
          totalInserted += result.inserted;
        }

        const summary = totalInserted > 0 
          ? `Stored ${totalInserted} signal rows for ${categorySlug}.` 
          : `No provider metrics matched the current ${categorySlug} catalog.`;

        await step.run("mark-job-success", () => finishJobStatus(jobKey, summary));
      } catch (error) {
        await step.run("mark-job-error", () => failJobStatus(jobKey, error));
        throw error;
      }
    }
  );
};

const appCreatedEmbedding = inngest.createFunction(
  {
    id: "app-created-embedding",
    triggers: [eventType("app.created")]
  },
  async ({ event }) => {
    const appId = String((event.data as Record<string, unknown>).appId ?? "");
    await runEmbeddingRefresh(appId, "app.created");
  },
);

const appUpdatedEmbedding = inngest.createFunction(
  {
    id: "app-updated-embedding",
    triggers: [eventType("app.updated")]
  },
  async ({ event }) => {
    const appId = String((event.data as Record<string, unknown>).appId ?? "");
    await runEmbeddingRefresh(appId, "app.updated");
  },
);

const refreshDefiSignals = buildChunkedSignalRefresh("signals.refresh.defi", "defi");
const refreshLendingYieldSignals = buildChunkedSignalRefresh("signals.refresh.lending_yield", "lending-yield");
const refreshPredictionMarketSignals = buildChunkedSignalRefresh("signals.refresh.prediction_markets", "prediction-markets");

const weeklySnapshots = inngest.createFunction(
  {
    id: "weekly-signal-snapshots",
    triggers: [cron("0 */12 * * *")]
  },
  async ({ step }) => {
    // TODO: HARDENED FOR VERCEL PRODUCTION DEPLOYMENT
    await step.run("run-weekly-snapshots", () => runWeeklySnapshots());
  },
);

const trendingRecompute = inngest.createFunction(
  {
    id: "trending-recompute",
    triggers: [cron("0 */12 * * *")]
  },
  async ({ step }) => {
    // TODO: HARDENED FOR VERCEL PRODUCTION DEPLOYMENT
    await step.run("run-trending-recompute", () => runTrendingRecompute());
  },
);

const risingRecompute = inngest.createFunction(
  {
    id: "rising-recompute",
    triggers: [cron("0 */12 * * *")]
  },
  async ({ step }) => {
    // TODO: HARDENED FOR VERCEL PRODUCTION DEPLOYMENT
    await step.run("run-rising-recompute", () => runRisingRecompute());
  },
);

const communityPickRecompute = inngest.createFunction(
  {
    id: "community-pick-recompute",
    triggers: [cron("0 */12 * * *")]
  },
  async ({ step }) => {
    // TODO: HARDENED FOR VERCEL PRODUCTION DEPLOYMENT
    await step.run("run-community-pick-recompute", () => runCommunityPickRecompute());
  },
);

export const inngestFunctions = [
  appCreatedEmbedding,
  appUpdatedEmbedding,
  refreshDefiSignals,
  refreshLendingYieldSignals,
  refreshPredictionMarketSignals,
  weeklySnapshots,
  trendingRecompute,
  risingRecompute,
  communityPickRecompute
];

export const inngestHandler = serve({
  client: inngest,
  functions: inngestFunctions
});
