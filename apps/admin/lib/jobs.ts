import {
  appendAppSignals,
  listDiscoveryDebugRows,
  listAppsForSignalCategory,
  listSignalJobStatuses,
  prisma,
  recomputeDiscoveryInsights,
  storeWeeklySignalSnapshots,
  updateSignalJobStatus
} from "@cotana/db";
import { setCacheValue } from "@cotana/db/redis";
import { upsertAppEmbedding } from "@cotana/search";
import { fetchDefiSignals, fetchLendingYieldSignals } from "@cotana/search/providers/defillama";
import { fetchCovalentSignals } from "@cotana/search/providers/covalent";

export const signalJobCatalog = [
  {
    key: "signals.refresh.defi",
    label: "DeFi refresh",
    schedule: "Every 6 hours"
  },
  {
    key: "signals.refresh.lending_yield",
    label: "Lending & yield refresh",
    schedule: "Every 4 hours"
  },
  {
    key: "signals.refresh.prediction_markets",
    label: "Prediction markets refresh",
    schedule: "Every 6 hours"
  },
  {
    key: "snapshots.weekly",
    label: "Weekly snapshots",
    schedule: "Sunday 00:00 UTC"
  },
  {
    key: "trending.recompute",
    label: "Trending recompute",
    schedule: "Every hour"
  },
  {
    key: "rising.recompute",
    label: "Rising recompute",
    schedule: "Every hour"
  },
  {
    key: "community_pick.recompute",
    label: "Community pick recompute",
    schedule: "First day of month 00:00 UTC"
  }
] as const;

export type SignalJobKey = (typeof signalJobCatalog)[number]["key"];

async function withJobStatus<T>(key: string, handler: () => Promise<T>) {
  const now = new Date().toISOString();

  await updateSignalJobStatus(key, {
    status: "running",
    lastRunAt: now,
    lastError: null
  });

  try {
    const result = await handler();
    await updateSignalJobStatus(key, {
      status: "success",
      lastRunAt: now,
      lastSuccessAt: new Date().toISOString(),
      lastError: null,
      summary: typeof result === "string" ? result : "Completed successfully."
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown job error.";

    await updateSignalJobStatus(key, {
      status: "error",
      lastRunAt: now,
      lastError: message,
      summary: message
    });

    throw error;
  }
}

export async function runEmbeddingRefresh(appId: string, eventKey: "app.created" | "app.updated") {
  return withJobStatus(eventKey, async () => {
    const result = await upsertAppEmbedding(appId);
    return result ? `Embedding refreshed for ${result.appId}.` : "App not found.";
  });
}

export async function runSignalRefresh(jobKey: Extract<SignalJobKey, `signals.refresh.${string}`>) {
  return withJobStatus(jobKey, async () => {
    const categorySlug =
      jobKey === "signals.refresh.lending_yield"
        ? "lending-yield"
        : jobKey === "signals.refresh.prediction_markets"
          ? "prediction-markets"
          : "defi";

    const apps = await listAppsForSignalCategory(categorySlug);

    if (apps.length === 0) {
      return `No published apps found for ${categorySlug}.`;
    }

    const providerResults =
      categorySlug === "lending-yield"
        ? [
            ...(await fetchLendingYieldSignals(apps)),
            ...(await fetchCovalentSignals("lending-yield", apps))
          ]
        : categorySlug === "prediction-markets"
          ? await fetchCovalentSignals("prediction-markets", apps)
          : [...(await fetchDefiSignals(apps)), ...(await fetchCovalentSignals("defi", apps))];

    let insertedSignals = 0;

    for (const result of providerResults) {
      const metrics = Object.entries(result.signals).map(([signalKey, numericValue]) => ({
        signalType: "category_metric",
        signalKey,
        numericValue
      }));

      insertedSignals += await appendAppSignals(result.appId, metrics, result.source);
    }

    return insertedSignals > 0
      ? `Stored ${insertedSignals} signal rows for ${categorySlug}.`
      : `No provider metrics matched the current ${categorySlug} catalog.`;
  });
}

export async function runWeeklySnapshots() {
  return withJobStatus("snapshots.weekly", async () => {
    const snapshotCount = await storeWeeklySignalSnapshots();
    return snapshotCount > 0 ? `Stored ${snapshotCount} signal snapshots.` : "No numeric signals were available to snapshot.";
  });
}

export async function runTrendingRecompute() {
  return withJobStatus("trending.recompute", async () => {
    const result = await recomputeDiscoveryInsights({ trending: true });
    const debugRows = await listDiscoveryDebugRows("TRENDING", {
      limit: 5
    });

    await setCacheValue(
      "trending:default",
      {
        computedAt: result.computedAt.toISOString(),
        rows: debugRows.rows.map((row) => ({
          appId: row.appId,
          score: row.score
        }))
      },
      60 * 60,
    );

    return `Recomputed trending for ${result.trendingCount} apps.`;
  });
}

export async function runRisingRecompute() {
  return withJobStatus("rising.recompute", async () => {
    const result = await recomputeDiscoveryInsights({ rising: true });
    const debugRows = await listDiscoveryDebugRows("RISING", {
      limit: 5
    });

    await setCacheValue(
      "rising:default",
      {
        computedAt: result.computedAt.toISOString(),
        rows: debugRows.rows.map((row) => ({
          appId: row.appId,
          score: row.score
        }))
      },
      60 * 60,
    );

    return `Recomputed rising for ${result.risingCount} apps.`;
  });
}

export async function runCommunityPickRecompute() {
  return withJobStatus("community_pick.recompute", async () => {
    const result = await recomputeDiscoveryInsights({ communityPick: true });

    await prisma.configKV.upsert({
      where: {
        key: "cache.community_pick.current"
      },
      update: {
        valueJson: {
          computedAt: result.computedAt.toISOString(),
          count: result.communityPickCount
        }
      },
      create: {
        key: "cache.community_pick.current",
        valueJson: {
          computedAt: result.computedAt.toISOString(),
          count: result.communityPickCount
        }
      }
    });

    return `Recomputed community picks for ${result.communityPickCount} apps.`;
  });
}

export async function listSignalJobsWithStatus() {
  const statuses = await listSignalJobStatuses();
  const statusMap = new Map(statuses.map((status) => [status.key, status]));

  return signalJobCatalog.map((job) => ({
    ...job,
    status: statusMap.get(job.key)?.status ?? "idle",
    lastRunAt: statusMap.get(job.key)?.lastRunAt ?? null,
    lastSuccessAt: statusMap.get(job.key)?.lastSuccessAt ?? null,
    lastError: statusMap.get(job.key)?.lastError ?? null,
    summary: statusMap.get(job.key)?.summary ?? null
  }));
}

export async function runManualSignalJob(jobKey: SignalJobKey) {
  switch (jobKey) {
    case "signals.refresh.defi":
    case "signals.refresh.lending_yield":
    case "signals.refresh.prediction_markets":
      return runSignalRefresh(jobKey);
    case "snapshots.weekly":
      return runWeeklySnapshots();
    case "trending.recompute":
      return runTrendingRecompute();
    case "rising.recompute":
      return runRisingRecompute();
    case "community_pick.recompute":
      return runCommunityPickRecompute();
  }
}
