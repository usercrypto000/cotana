import { cron, eventType } from "inngest";
import { serve } from "inngest/next";
import { inngest } from "./inngest";
import {
  runCommunityPickPlaceholder,
  runEmbeddingRefresh,
  runSignalRefresh,
  runTrendingRecompute,
  runWeeklySnapshots
} from "./jobs";

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

const refreshDefiSignals = inngest.createFunction(
  {
    id: "signals-refresh-defi",
    triggers: [cron("0 */6 * * *")]
  },
  async () => {
    await runSignalRefresh("signals.refresh.defi");
  },
);

const refreshLendingYieldSignals = inngest.createFunction(
  {
    id: "signals-refresh-lending-yield",
    triggers: [cron("0 */4 * * *")]
  },
  async () => {
    await runSignalRefresh("signals.refresh.lending_yield");
  },
);

const refreshPredictionMarketSignals = inngest.createFunction(
  {
    id: "signals-refresh-prediction-markets",
    triggers: [cron("0 */6 * * *")]
  },
  async () => {
    await runSignalRefresh("signals.refresh.prediction_markets");
  },
);

const weeklySnapshots = inngest.createFunction(
  {
    id: "weekly-signal-snapshots",
    triggers: [cron("0 0 * * 0")]
  },
  async () => {
    await runWeeklySnapshots();
  },
);

const trendingRecompute = inngest.createFunction(
  {
    id: "trending-recompute",
    triggers: [cron("0 * * * *")]
  },
  async () => {
    await runTrendingRecompute();
  },
);

const communityPickRecompute = inngest.createFunction(
  {
    id: "community-pick-recompute",
    triggers: [cron("0 12 * * 1")]
  },
  async () => {
    await runCommunityPickPlaceholder();
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
  communityPickRecompute
];

export const inngestHandler = serve({
  client: inngest,
  functions: inngestFunctions
});
