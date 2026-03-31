import {
  appendAppSignals,
  listAppsForSignalCategory,
  listSignalJobStatuses,
  prisma,
  storeWeeklySignalSnapshots,
  updateSignalJobStatus
} from "@cotana/db";
import { setCacheValue } from "@cotana/db/redis";
import { upsertAppEmbedding } from "@cotana/search";
import { fetchDefiSignals, fetchLendingYieldSignals } from "@cotana/search/providers/defillama";
import { fetchDuneSignals } from "@cotana/search/providers/dune";

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
    key: "community_pick.recompute",
    label: "Community pick placeholder",
    schedule: "Manual or scheduled placeholder"
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
            ...(await fetchDuneSignals("lending-yield", apps))
          ]
        : categorySlug === "prediction-markets"
          ? await fetchDuneSignals("prediction-markets", apps)
          : [...(await fetchDefiSignals(apps)), ...(await fetchDuneSignals("defi", apps))];

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
    const publishedApps = await prisma.app.findMany({
      where: {
        status: "PUBLISHED"
      },
      select: {
        id: true,
        slug: true
      }
    });
    const appIds = publishedApps.map((app) => app.id);

    if (appIds.length === 0) {
      return "No published apps available for trending.";
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    const [viewCounts, likeCounts] = await Promise.all([
      prisma.appView.groupBy({
        by: ["appId"],
        where: {
          appId: {
            in: appIds
          },
          createdAt: {
            gte: cutoff
          }
        },
        _count: {
          _all: true
        }
      }),
      prisma.appLike.groupBy({
        by: ["appId"],
        where: {
          appId: {
            in: appIds
          }
        },
        _count: {
          _all: true
        }
      })
    ]);

    const viewMap = new Map(viewCounts.map((row) => [row.appId, row._count._all]));
    const likeMap = new Map(likeCounts.map((row) => [row.appId, row._count._all]));

    const ranked = publishedApps
      .map((app) => ({
        appId: app.id,
        slug: app.slug,
        score: (viewMap.get(app.id) ?? 0) * 2 + (likeMap.get(app.id) ?? 0)
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, 12);

    await prisma.configKV.upsert({
      where: {
        key: "cache.trending.default"
      },
      update: {
        valueJson: {
          computedAt: new Date().toISOString(),
          appIds: ranked.map((item) => item.appId)
        }
      },
      create: {
        key: "cache.trending.default",
        valueJson: {
          computedAt: new Date().toISOString(),
          appIds: ranked.map((item) => item.appId)
        }
      }
    });

    await setCacheValue(
      "trending:default",
      {
        computedAt: new Date().toISOString(),
        appIds: ranked.map((item) => item.appId)
      },
      60 * 60,
    );

    return `Recomputed trending cache for ${ranked.length} apps.`;
  });
}

export async function runCommunityPickPlaceholder() {
  return withJobStatus("community_pick.recompute", async () => {
    await prisma.configKV.upsert({
      where: {
        key: "cache.community_pick.placeholder"
      },
      update: {
        valueJson: {
          computedAt: new Date().toISOString(),
          status: "placeholder"
        }
      },
      create: {
        key: "cache.community_pick.placeholder",
        valueJson: {
          computedAt: new Date().toISOString(),
          status: "placeholder"
        }
      }
    });

    return "Community pick placeholder job completed.";
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
    case "community_pick.recompute":
      return runCommunityPickPlaceholder();
  }
}
