import { AppStatus, Prisma } from "@prisma/client";
import { prisma } from "../client";

export type SignalMetricInput = {
  signalType: string;
  signalKey: string;
  numericValue?: number | null;
  stringValue?: string | null;
  jsonValue?: Prisma.InputJsonValue | null;
};

export type SignalJobStatus = {
  key: string;
  status: "idle" | "running" | "success" | "error";
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  summary: string | null;
};

export async function listAppsForSignalCategory(categorySlug: string) {
  return prisma.app.findMany({
    where: {
      status: AppStatus.PUBLISHED,
      category: {
        slug: categorySlug
      }
    },
    select: {
      id: true,
      slug: true,
      name: true,
      category: {
        select: {
          slug: true,
          name: true,
          sortOrder: true
        }
      }
    },
    orderBy: {
      publishedAt: "desc"
    }
  });
}

export async function listLatestNumericSignals(appIds?: string[]) {
  const rows = await prisma.appSignal.findMany({
    where: {
      ...(appIds && appIds.length > 0
        ? {
            appId: {
              in: appIds
            }
          }
        : {}),
      numericValue: {
        not: null
      }
    },
    orderBy: [
      {
        observedAt: "desc"
      }
    ]
  });

  const map = new Map<string, Record<string, number>>();

  for (const row of rows) {
    const current = map.get(row.appId) ?? {};

    if (typeof current[row.signalKey] !== "number" && typeof row.numericValue === "number") {
      current[row.signalKey] = row.numericValue;
      map.set(row.appId, current);
    }
  }

  return map;
}

export async function appendAppSignals(
  appId: string,
  metrics: SignalMetricInput[],
  source: string,
  observedAt = new Date(),
) {
  if (metrics.length === 0) {
    return 0;
  }

  await prisma.appSignal.createMany({
    data: metrics.map((metric) => ({
      appId,
      signalType: metric.signalType,
      signalKey: metric.signalKey,
      numericValue: metric.numericValue ?? null,
      stringValue: metric.stringValue ?? null,
      jsonValue: metric.jsonValue ?? undefined,
      source,
      observedAt
    }))
  });

  return metrics.length;
}

export async function storeWeeklySignalSnapshots(observedAt = new Date()) {
  const apps = await prisma.app.findMany({
    where: {
      status: AppStatus.PUBLISHED
    },
    include: {
      category: true,
      signals: {
        where: {
          numericValue: {
            not: null
          }
        },
        orderBy: {
          observedAt: "desc"
        }
      }
    }
  });

  const snapshotRows: Array<{
    appId: string;
    category: string;
    metric: string;
    numericValue: number;
    observedAt: Date;
  }> = [];

  for (const app of apps) {
    const seenMetrics = new Set<string>();

    for (const signal of app.signals) {
      if (typeof signal.numericValue !== "number" || seenMetrics.has(signal.signalKey)) {
        continue;
      }

      seenMetrics.add(signal.signalKey);
      snapshotRows.push({
        appId: app.id,
        category: app.category.slug,
        metric: signal.signalKey,
        numericValue: signal.numericValue,
        observedAt
      });
    }
  }

  if (snapshotRows.length === 0) {
    return 0;
  }

  await prisma.appSignalSnapshot.createMany({
    data: snapshotRows
  });

  return snapshotRows.length;
}

export async function updateSignalJobStatus(
  key: string,
  input: Partial<SignalJobStatus> & Pick<SignalJobStatus, "status">,
) {
  const existing = await prisma.configKV.findUnique({
    where: {
      key: `job.status.${key}`
    }
  });

  const existingValue =
    existing?.valueJson && typeof existing.valueJson === "object" && !Array.isArray(existing.valueJson)
      ? (existing.valueJson as Record<string, unknown>)
      : {};

  const nextValue = {
    key,
    status: input.status,
    lastRunAt: input.lastRunAt ?? existingValue.lastRunAt ?? null,
    lastSuccessAt: input.lastSuccessAt ?? existingValue.lastSuccessAt ?? null,
    lastError: input.lastError ?? existingValue.lastError ?? null,
    summary: input.summary ?? existingValue.summary ?? null
  };

  await prisma.configKV.upsert({
    where: {
      key: `job.status.${key}`
    },
    update: {
      valueJson: nextValue
    },
    create: {
      key: `job.status.${key}`,
      valueJson: nextValue
    }
  });

  return nextValue as SignalJobStatus;
}

export async function listSignalJobStatuses() {
  const rows = await prisma.configKV.findMany({
    where: {
      key: {
        startsWith: "job.status."
      }
    },
    orderBy: {
      key: "asc"
    }
  });

  return rows.map((row) => {
    const value =
      row.valueJson && typeof row.valueJson === "object" && !Array.isArray(row.valueJson)
        ? (row.valueJson as Record<string, unknown>)
        : {};

    return {
      key: String(value.key ?? row.key.replace("job.status.", "")),
      status: (value.status as SignalJobStatus["status"]) ?? "idle",
      lastRunAt: typeof value.lastRunAt === "string" ? value.lastRunAt : null,
      lastSuccessAt: typeof value.lastSuccessAt === "string" ? value.lastSuccessAt : null,
      lastError: typeof value.lastError === "string" ? value.lastError : null,
      summary: typeof value.summary === "string" ? value.summary : null
    } satisfies SignalJobStatus;
  });
}
