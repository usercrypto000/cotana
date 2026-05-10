import { DiscoveryInsightKind, Prisma, ReviewStatus } from "@prisma/client";
import { z } from "zod";
import type { AppSummary, DiscoveryScoreInputs } from "@cotana/types";
import {
  ageScore,
  defaultCommunityPickWeights,
  defaultRisingWeights,
  defaultTrendingWeights,
  moderationSafetyScore,
  normalizeMetricMap,
  qualifiesCommunityPick,
  safeGrowthRate,
  scoreCommunityPickCandidate,
  scoreRisingCandidate,
  scoreTrendingCandidate,
  type CommunityPickWeights,
  type DiscoveryNormalizedMetrics,
  type RisingWeights,
  type TrendingWeights
} from "./discovery-formulas";
import { deleteCacheValue, getCacheValue, setCacheValue } from "../redis";
import { prisma } from "../client";

const DISCOVERY_WINDOW_DAYS = 7;
const DISCOVERY_CACHE_TTL_SECONDS = 60 * 30;

const trendingWeightsSchema = z.object({
  viewVelocity: z.number().min(0),
  searchCtr: z.number().min(0),
  likeVelocity: z.number().min(0),
  reviewVelocity: z.number().min(0),
  signalMomentum: z.number().min(0)
});

const risingWeightsSchema = z.object({
  viewGrowth: z.number().min(0),
  clickGrowth: z.number().min(0),
  likeGrowth: z.number().min(0),
  reviewGrowth: z.number().min(0),
  signalMomentum: z.number().min(0),
  lowHistoryBoost: z.number().min(0)
});

const communityPickWeightsSchema = z.object({
  ratingQuality: z.number().min(0),
  reviewCountQuality: z.number().min(0),
  likeVelocity: z.number().min(0),
  engagementQuality: z.number().min(0),
  moderationSafety: z.number().min(0),
  minRating: z.number().min(0).max(5),
  minReviewCount: z.number().int().min(0),
  maxModerationRisk: z.number().min(0).max(1),
  scoreThreshold: z.number().min(0).max(1)
});

type DiscoveryKind = "TRENDING" | "RISING" | "COMMUNITY_PICK";

type PublishedAppRecord = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
  verified: boolean;
  agentAudience: "HUMAN" | "AGENT" | "HYBRID";
  communityPick: boolean;
  shortDescription: string;
  longDescription: string;
  publishedAt: Date | null;
  createdAt: Date;
  category: {
    id: string;
    slug: string;
    name: string;
    sortOrder: number;
  };
};

type DiscoveryMetricRow = {
  app: PublishedAppRecord;
  viewsCurrent: number;
  viewsPrevious: number;
  searchClicksCurrent: number;
  searchClicksPrevious: number;
  searchesCurrent: number;
  likesCurrent: number;
  likesPrevious: number;
  reviewsCurrent: number;
  reviewsPrevious: number;
  signalMomentum: number;
  ageInDays: number;
  averageRating: number;
  reviewCount: number;
  moderationRisk: number;
};

type RankedDiscoveryRow = {
  app: PublishedAppRecord;
  score: number;
  rank: number;
  inputs: DiscoveryScoreInputs;
  normalized: DiscoveryNormalizedMetrics;
};

export type DiscoveryAppResult = {
  app: AppSummary;
  score: number;
  rank: number;
  inputs: DiscoveryScoreInputs;
  computedAt: Date;
};

type DiscoveryCachePayload = {
  computedAt: string;
  rows: DiscoveryAppResult[];
};

function toMonthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildDiscoveryCacheKey(kind: DiscoveryKind, categorySlug?: string | null) {
  return `discovery:${kind.toLowerCase()}:${categorySlug ?? "global"}`;
}

function differenceInDays(left: Date, right: Date) {
  return Math.max(0, Math.floor((left.getTime() - right.getTime()) / (1000 * 60 * 60 * 24)));
}

function toSummary(
  app: PublishedAppRecord,
  stats: { rating: number; reviewCount: number; likeCount: number },
): AppSummary {
  return {
    id: app.id,
    slug: app.slug,
    name: app.name,
    logoUrl: app.logoUrl,
    verified: app.verified,
    agentAudience: app.agentAudience,
    communityPick: app.communityPick,
    shortDescription: app.shortDescription,
    longDescription: app.longDescription,
    publishedAt: app.publishedAt,
    category: app.category,
    rating: stats.rating,
    reviewCount: stats.reviewCount,
    likeCount: stats.likeCount
  };
}

async function loadConfig<T>(key: string, schema: z.ZodSchema<T>, fallback: T) {
  const row = await prisma.configKV.findUnique({
    where: {
      key
    }
  });

  if (!row) {
    return fallback;
  }

  const parsed = schema.safeParse(row.valueJson);
  return parsed.success ? parsed.data : fallback;
}

async function loadPublishedApps() {
  return prisma.app.findMany({
    where: {
      status: "PUBLISHED"
    },
    include: {
      category: true
    },
    orderBy: [
      {
        category: {
          sortOrder: "asc"
        }
      },
      {
        publishedAt: "desc"
      }
    ]
  });
}

async function getGroupedCounts<T extends { appId: string; _count: { _all: number } }>(
  rowsPromise: Promise<T[]>,
) {
  const rows = await rowsPromise;
  return new Map(rows.map((row) => [row.appId, row._count._all]));
}

async function getReviewAggregates(appIds: string[]) {
  const [publishedStats, moderatedCounts] = await Promise.all([
    prisma.review.groupBy({
      by: ["appId"],
      where: {
        appId: {
          in: appIds
        },
        status: {
          in: [ReviewStatus.PUBLISHED, ReviewStatus.FLAGGED]
        }
      },
      _avg: {
        rating: true
      },
      _count: {
        _all: true
      }
    }),
    prisma.review.groupBy({
      by: ["appId"],
      where: {
        appId: {
          in: appIds
        },
        status: {
          in: [ReviewStatus.FLAGGED, ReviewStatus.REMOVED]
        }
      },
      _count: {
        _all: true
      }
    })
  ]);

  const publishedMap = new Map(
    publishedStats.map((row) => [
      row.appId,
      {
        averageRating: row._avg.rating ?? 0,
        reviewCount: row._count._all
      }
    ]),
  );
  const moderatedMap = new Map(moderatedCounts.map((row) => [row.appId, row._count._all]));

  return new Map(
    appIds.map((appId) => {
      const stats = publishedMap.get(appId) ?? { averageRating: 0, reviewCount: 0 };
      const moderatedCount = moderatedMap.get(appId) ?? 0;

      return [
        appId,
        {
          ...stats,
          moderationRisk: stats.reviewCount > 0 ? moderatedCount / Math.max(stats.reviewCount, 1) : 0
        }
      ] as const;
    }),
  );
}

function buildSignalMomentumMap(rows: Array<{ appId: string; signalKey: string; numericValue: number | null; observedAt: Date }>, cutoff: Date) {
  const latestByApp = new Map<string, Record<string, number>>();
  const baselineByApp = new Map<string, Record<string, number>>();

  for (const row of rows) {
    if (typeof row.numericValue !== "number") {
      continue;
    }

    const latest = latestByApp.get(row.appId) ?? {};
    const baseline = baselineByApp.get(row.appId) ?? {};

    if (typeof latest[row.signalKey] !== "number") {
      latest[row.signalKey] = row.numericValue;
      latestByApp.set(row.appId, latest);
      continue;
    }

    if (row.observedAt < cutoff && typeof baseline[row.signalKey] !== "number") {
      baseline[row.signalKey] = row.numericValue;
      baselineByApp.set(row.appId, baseline);
    }
  }

  return new Map(
    [...latestByApp.keys()].map((appId) => {
      const latest = latestByApp.get(appId) ?? {};
      const baseline = baselineByApp.get(appId) ?? {};
      const metrics = Object.keys(latest);

      if (metrics.length === 0) {
        return [appId, 0] as const;
      }

      const deltas = metrics.map((metric) => {
        const current = latest[metric] ?? 0;
        const previous = baseline[metric] ?? 0;
        return safeGrowthRate(current, previous);
      });

      const momentum = deltas.reduce((sum, value) => sum + value, 0) / Math.max(deltas.length, 1);
      return [appId, momentum] as const;
    }),
  );
}

async function loadDiscoveryMetricRows() {
  const now = new Date();
  const currentWindowStart = new Date(now);
  currentWindowStart.setDate(currentWindowStart.getDate() - DISCOVERY_WINDOW_DAYS);
  const previousWindowStart = new Date(currentWindowStart);
  previousWindowStart.setDate(previousWindowStart.getDate() - DISCOVERY_WINDOW_DAYS);

  const apps = await loadPublishedApps();
  const appIds = apps.map((app) => app.id);

  if (appIds.length === 0) {
    return {
      rows: [] as DiscoveryMetricRow[],
      windowStart: currentWindowStart,
      windowEnd: now
    };
  }

  const [
    viewsCurrent,
    viewsPrevious,
    searchClicksCurrent,
    searchClicksPrevious,
    totalSearchesCurrent,
    likesCurrent,
    likesPrevious,
    reviewsCurrent,
    reviewsPrevious,
    reviewAggregates,
    appSignals
  ] = await Promise.all([
    getGroupedCounts(
      prisma.appView.groupBy({
        by: ["appId"],
        where: {
          appId: {
            in: appIds
          },
          createdAt: {
            gte: currentWindowStart
          }
        },
        _count: {
          _all: true
        }
      }),
    ),
    getGroupedCounts(
      prisma.appView.groupBy({
        by: ["appId"],
        where: {
          appId: {
            in: appIds
          },
          createdAt: {
            gte: previousWindowStart,
            lt: currentWindowStart
          }
        },
        _count: {
          _all: true
        }
      }),
    ),
    getGroupedCounts(
      prisma.searchClick.groupBy({
        by: ["appId"],
        where: {
          appId: {
            in: appIds
          },
          createdAt: {
            gte: currentWindowStart
          }
        },
        _count: {
          _all: true
        }
      }),
    ),
    getGroupedCounts(
      prisma.searchClick.groupBy({
        by: ["appId"],
        where: {
          appId: {
            in: appIds
          },
          createdAt: {
            gte: previousWindowStart,
            lt: currentWindowStart
          }
        },
        _count: {
          _all: true
        }
      }),
    ),
    prisma.searchEvent.count({
      where: {
        createdAt: {
          gte: currentWindowStart
        }
      }
    }),
    getGroupedCounts(
      prisma.appLike.groupBy({
        by: ["appId"],
        where: {
          appId: {
            in: appIds
          },
          createdAt: {
            gte: currentWindowStart
          }
        },
        _count: {
          _all: true
        }
      }),
    ),
    getGroupedCounts(
      prisma.appLike.groupBy({
        by: ["appId"],
        where: {
          appId: {
            in: appIds
          },
          createdAt: {
            gte: previousWindowStart,
            lt: currentWindowStart
          }
        },
        _count: {
          _all: true
        }
      }),
    ),
    getGroupedCounts(
      prisma.review.groupBy({
        by: ["appId"],
        where: {
          appId: {
            in: appIds
          },
          status: {
            in: [ReviewStatus.PUBLISHED, ReviewStatus.FLAGGED]
          },
          createdAt: {
            gte: currentWindowStart
          }
        },
        _count: {
          _all: true
        }
      }),
    ),
    getGroupedCounts(
      prisma.review.groupBy({
        by: ["appId"],
        where: {
          appId: {
            in: appIds
          },
          status: {
            in: [ReviewStatus.PUBLISHED, ReviewStatus.FLAGGED]
          },
          createdAt: {
            gte: previousWindowStart,
            lt: currentWindowStart
          }
        },
        _count: {
          _all: true
        }
      }),
    ),
    getReviewAggregates(appIds),
    prisma.appSignal.findMany({
      where: {
        appId: {
          in: appIds
        },
        numericValue: {
          not: null
        }
      },
      select: {
        appId: true,
        signalKey: true,
        numericValue: true,
        observedAt: true
      },
      orderBy: {
        observedAt: "desc"
      }
    })
  ]);

  const signalMomentum = buildSignalMomentumMap(appSignals, currentWindowStart);

  return {
    rows: apps.map<DiscoveryMetricRow>((app) => {
      const reviewAggregate = reviewAggregates.get(app.id) ?? {
        averageRating: 0,
        reviewCount: 0,
        moderationRisk: 0
      };

      return {
        app,
        viewsCurrent: viewsCurrent.get(app.id) ?? 0,
        viewsPrevious: viewsPrevious.get(app.id) ?? 0,
        searchClicksCurrent: searchClicksCurrent.get(app.id) ?? 0,
        searchClicksPrevious: searchClicksPrevious.get(app.id) ?? 0,
        searchesCurrent: totalSearchesCurrent,
        likesCurrent: likesCurrent.get(app.id) ?? 0,
        likesPrevious: likesPrevious.get(app.id) ?? 0,
        reviewsCurrent: reviewsCurrent.get(app.id) ?? 0,
        reviewsPrevious: reviewsPrevious.get(app.id) ?? 0,
        signalMomentum: signalMomentum.get(app.id) ?? 0,
        ageInDays: differenceInDays(now, app.publishedAt ?? app.createdAt),
        averageRating: reviewAggregate.averageRating,
        reviewCount: reviewAggregate.reviewCount,
        moderationRisk: reviewAggregate.moderationRisk
      };
    }),
    windowStart: currentWindowStart,
    windowEnd: now
  };
}

function normalizeRows(rows: DiscoveryMetricRow[]) {
  const normalizedViews = normalizeMetricMap(Object.fromEntries(rows.map((row) => [row.app.id, row.viewsCurrent])));
  const normalizedClicks = normalizeMetricMap(
    Object.fromEntries(rows.map((row) => [row.app.id, row.searchClicksCurrent])),
  );
  const normalizedLikes = normalizeMetricMap(Object.fromEntries(rows.map((row) => [row.app.id, row.likesCurrent])));
  const normalizedReviews = normalizeMetricMap(Object.fromEntries(rows.map((row) => [row.app.id, row.reviewsCurrent])));
  const normalizedCtr = normalizeMetricMap(
    Object.fromEntries(
      rows.map((row) => [
        row.app.id,
        row.searchClicksCurrent / Math.max(row.searchesCurrent, 1)
      ]),
    ),
  );
  const normalizedSignalMomentum = normalizeMetricMap(
    Object.fromEntries(rows.map((row) => [row.app.id, row.signalMomentum])),
  );
  const normalizedViewGrowth = normalizeMetricMap(
    Object.fromEntries(rows.map((row) => [row.app.id, safeGrowthRate(row.viewsCurrent, row.viewsPrevious)])),
  );
  const normalizedClickGrowth = normalizeMetricMap(
    Object.fromEntries(
      rows.map((row) => [row.app.id, safeGrowthRate(row.searchClicksCurrent, row.searchClicksPrevious)]),
    ),
  );
  const normalizedLikeGrowth = normalizeMetricMap(
    Object.fromEntries(rows.map((row) => [row.app.id, safeGrowthRate(row.likesCurrent, row.likesPrevious)])),
  );
  const normalizedReviewGrowth = normalizeMetricMap(
    Object.fromEntries(rows.map((row) => [row.app.id, safeGrowthRate(row.reviewsCurrent, row.reviewsPrevious)])),
  );
  const normalizedReviewCount = normalizeMetricMap(
    Object.fromEntries(rows.map((row) => [row.app.id, row.reviewCount])),
  );

  return new Map(
    rows.map((row) => {
      const engagementQuality =
        (normalizedViews[row.app.id] +
          normalizedClicks[row.app.id] +
          normalizedLikes[row.app.id] +
          normalizedReviews[row.app.id]) /
        4;

      return [
        row.app.id,
        {
          viewVelocity: normalizedViews[row.app.id] ?? 0,
          clickVelocity: normalizedClicks[row.app.id] ?? 0,
          searchCtr: normalizedCtr[row.app.id] ?? 0,
          likeVelocity: normalizedLikes[row.app.id] ?? 0,
          reviewVelocity: normalizedReviews[row.app.id] ?? 0,
          signalMomentum: normalizedSignalMomentum[row.app.id] ?? 0,
          viewGrowth: normalizedViewGrowth[row.app.id] ?? 0,
          clickGrowth: normalizedClickGrowth[row.app.id] ?? 0,
          likeGrowth: normalizedLikeGrowth[row.app.id] ?? 0,
          reviewGrowth: normalizedReviewGrowth[row.app.id] ?? 0,
          ageScore: ageScore(row.ageInDays),
          engagementQuality,
          ratingQuality: row.averageRating / 5,
          reviewCountQuality: normalizedReviewCount[row.app.id] ?? 0,
          moderationSafety: moderationSafetyScore(row.moderationRisk)
        } satisfies DiscoveryNormalizedMetrics
      ] as const;
    }),
  );
}

function buildScoreInputs(row: DiscoveryMetricRow): DiscoveryScoreInputs {
  return {
    viewsCurrent: row.viewsCurrent,
    viewsPrevious: row.viewsPrevious,
    searchClicksCurrent: row.searchClicksCurrent,
    searchClicksPrevious: row.searchClicksPrevious,
    searchesCurrent: row.searchesCurrent,
    likesCurrent: row.likesCurrent,
    likesPrevious: row.likesPrevious,
    reviewsCurrent: row.reviewsCurrent,
    reviewsPrevious: row.reviewsPrevious,
    signalMomentum: row.signalMomentum,
    ageInDays: row.ageInDays,
    averageRating: row.averageRating,
    reviewCount: row.reviewCount,
    moderationRisk: row.moderationRisk
  };
}

function rankRows(
  kind: DiscoveryKind,
  rows: DiscoveryMetricRow[],
  weights: {
    trending: TrendingWeights;
    rising: RisingWeights;
    communityPick: CommunityPickWeights;
  },
) {
  const normalized = normalizeRows(rows);

  const ranked = rows
    .map<RankedDiscoveryRow>((row) => {
      const metrics = normalized.get(row.app.id) ?? {
        viewVelocity: 0,
        clickVelocity: 0,
        searchCtr: 0,
        likeVelocity: 0,
        reviewVelocity: 0,
        signalMomentum: 0,
        viewGrowth: 0,
        clickGrowth: 0,
        likeGrowth: 0,
        reviewGrowth: 0,
        ageScore: 0,
        engagementQuality: 0,
        ratingQuality: 0,
        reviewCountQuality: 0,
        moderationSafety: 0
      };
      const inputs = buildScoreInputs(row);
      const lowHistory =
        row.viewsPrevious + row.searchClicksPrevious + row.likesPrevious + row.reviewsPrevious < 5;

      let score = 0;

      if (kind === "TRENDING") {
        score = scoreTrendingCandidate(metrics, weights.trending);
      } else if (kind === "RISING") {
        score = scoreRisingCandidate(metrics, weights.rising, { lowHistory });
      } else {
        score = qualifiesCommunityPick(
          metrics,
          {
            averageRating: row.averageRating,
            reviewCount: row.reviewCount,
            moderationRisk: row.moderationRisk
          },
          weights.communityPick,
        )
          ? scoreCommunityPickCandidate(metrics, weights.communityPick)
          : 0;
      }

      return {
        app: row.app,
        score,
        rank: 0,
        inputs,
        normalized: metrics
      };
    })
    .filter((row) => (kind === "COMMUNITY_PICK" ? row.score > 0 : true))
    .sort((left, right) => right.score - left.score || left.app.name.localeCompare(right.app.name))
    .map((row, index) => ({
      ...row,
      rank: index + 1
    }));

  return ranked;
}

async function invalidateDiscoveryCaches() {
  const categories = await prisma.category.findMany({
    select: {
      slug: true
    }
  });

  const keys = [
    buildDiscoveryCacheKey("TRENDING"),
    buildDiscoveryCacheKey("RISING"),
    buildDiscoveryCacheKey("COMMUNITY_PICK")
  ];

  for (const category of categories) {
    keys.push(buildDiscoveryCacheKey("TRENDING", category.slug));
    keys.push(buildDiscoveryCacheKey("RISING", category.slug));
  }

  await Promise.all(keys.map((key) => deleteCacheValue(key)));
}

async function persistSnapshots(
  kind: DiscoveryKind,
  rows: RankedDiscoveryRow[],
  categorySlug: string | null,
  windowStart: Date,
  windowEnd: Date,
  computedAt: Date,
) {
  if (rows.length === 0) {
    return;
  }

  await prisma.discoveryInsightSnapshot.createMany({
    data: rows.map((row) => ({
      appId: row.app.id,
      kind: kind as DiscoveryInsightKind,
      categorySlug,
      score: row.score,
      rank: row.rank,
      inputsJson: {
        raw: row.inputs,
        normalized: row.normalized
      },
      windowStart,
      windowEnd,
      computedAt
    }))
  });
}

async function enrichDiscoveryRows(
  rows: Array<{
    appId: string;
    score: number;
    rank: number;
    inputsJson: unknown;
  }>,
  computedAt: Date,
) {
  if (rows.length === 0) {
    return [];
  }

  const apps = await prisma.app.findMany({
    where: {
      id: {
        in: rows.map((row) => row.appId)
      }
    },
    include: {
      category: true
    }
  });

  const appMap = new Map(apps.map((app) => [app.id, app]));
  const reviewStats = await prisma.review.groupBy({
    by: ["appId"],
    where: {
      appId: {
        in: rows.map((row) => row.appId)
      },
      status: {
        in: [ReviewStatus.PUBLISHED, ReviewStatus.FLAGGED]
      }
    },
    _avg: {
      rating: true
    },
    _count: {
      _all: true
    }
  });
  const reviewMap = new Map(
    reviewStats.map((row) => [
      row.appId,
      {
        rating: row._avg.rating ?? 0,
        reviewCount: row._count._all
      }
    ]),
  );
  const likeStats = await prisma.appLike.groupBy({
    by: ["appId"],
    where: {
      appId: {
        in: rows.map((row) => row.appId)
      }
    },
    _count: {
      _all: true
    }
  });
  const likeMap = new Map(likeStats.map((row) => [row.appId, row._count._all]));

  return rows
    .map<DiscoveryAppResult | null>((row) => {
      const app = appMap.get(row.appId);

      if (!app) {
        return null;
      }

      return {
        app: toSummary(app, {
          rating: reviewMap.get(app.id)?.rating ?? 0,
          reviewCount: reviewMap.get(app.id)?.reviewCount ?? 0,
          likeCount: likeMap.get(app.id) ?? 0
        }),
        score: row.score,
        rank: row.rank,
        inputs:
          row.inputsJson && typeof row.inputsJson === "object" && !Array.isArray(row.inputsJson)
            ? ((row.inputsJson as { raw?: DiscoveryScoreInputs }).raw ?? {
                viewsCurrent: 0,
                viewsPrevious: 0,
                searchClicksCurrent: 0,
                searchClicksPrevious: 0,
                searchesCurrent: 0,
                likesCurrent: 0,
                likesPrevious: 0,
                reviewsCurrent: 0,
                reviewsPrevious: 0,
                signalMomentum: 0,
                ageInDays: 0,
                averageRating: 0,
                reviewCount: 0,
                moderationRisk: 0
              })
            : {
                viewsCurrent: 0,
                viewsPrevious: 0,
                searchClicksCurrent: 0,
                searchClicksPrevious: 0,
                searchesCurrent: 0,
                likesCurrent: 0,
                likesPrevious: 0,
                reviewsCurrent: 0,
                reviewsPrevious: 0,
                signalMomentum: 0,
                ageInDays: 0,
                averageRating: 0,
                reviewCount: 0,
                moderationRisk: 0
              },
        computedAt
      };
    })
    .filter((row): row is DiscoveryAppResult => Boolean(row))
    .sort((left, right) => left.rank - right.rank);
}

export async function recomputeDiscoveryInsights(options?: {
  trending?: boolean;
  rising?: boolean;
  communityPick?: boolean;
}) {
  const { rows, windowStart, windowEnd } = await loadDiscoveryMetricRows();
  const computedAt = new Date();
  const shouldRecomputeTrending = options?.trending ?? (!options || Object.keys(options).length === 0);
  const shouldRecomputeRising = options?.rising ?? (!options || Object.keys(options).length === 0);
  const shouldRecomputeCommunityPick = options?.communityPick ?? (!options || Object.keys(options).length === 0);
  const trending = await loadConfig("discovery.weights.trending", trendingWeightsSchema, defaultTrendingWeights);
  const rising = await loadConfig("discovery.weights.rising", risingWeightsSchema, defaultRisingWeights);
  const communityPick = await loadConfig(
    "discovery.weights.community_pick",
    communityPickWeightsSchema,
    defaultCommunityPickWeights,
  );
  const weights = {
    trending,
    rising,
    communityPick
  };

  await invalidateDiscoveryCaches();

  const categories = [...new Set(rows.map((row) => row.app.category.slug))];

  if (shouldRecomputeTrending) {
    await persistSnapshots("TRENDING", rankRows("TRENDING", rows, weights), null, windowStart, windowEnd, computedAt);

    for (const categorySlug of categories) {
      const categoryRows = rows.filter((row) => row.app.category.slug === categorySlug);
      await persistSnapshots(
        "TRENDING",
        rankRows("TRENDING", categoryRows, weights),
        categorySlug,
        windowStart,
        windowEnd,
        computedAt,
      );
    }
  }

  if (shouldRecomputeRising) {
    await persistSnapshots("RISING", rankRows("RISING", rows, weights), null, windowStart, windowEnd, computedAt);

    for (const categorySlug of categories) {
      const categoryRows = rows.filter((row) => row.app.category.slug === categorySlug);
      await persistSnapshots(
        "RISING",
        rankRows("RISING", categoryRows, weights),
        categorySlug,
        windowStart,
        windowEnd,
        computedAt,
      );
    }
  }

  let communityRows: RankedDiscoveryRow[] = [];

  if (shouldRecomputeCommunityPick) {
    communityRows = rankRows("COMMUNITY_PICK", rows, weights);
    await persistSnapshots("COMMUNITY_PICK", communityRows, null, windowStart, windowEnd, computedAt);

    const monthKey = toMonthKey(computedAt);
    await prisma.app.updateMany({
      data: {
        communityPick: false,
        communityPickMonth: monthKey,
        communityPickReason: Prisma.JsonNull,
        communityPickUpdatedAt: computedAt
      }
    });

    for (const row of communityRows) {
      await prisma.app.update({
        where: {
          id: row.app.id
        },
        data: {
          communityPick: true,
          communityPickMonth: monthKey,
          communityPickReason: {
            score: row.score,
            inputs: row.inputs,
            normalized: row.normalized
          },
          communityPickUpdatedAt: computedAt
        }
      });
    }
  }

  return {
    computedAt,
    trendingCount: shouldRecomputeTrending ? rows.length : 0,
    risingCount: shouldRecomputeRising ? rows.length : 0,
    communityPickCount: communityRows.length
  };
}

export async function listDiscoveryResults(kind: DiscoveryKind, options?: { categorySlug?: string | null; limit?: number }) {
  const categorySlug = options?.categorySlug ?? null;
  const cacheKey = buildDiscoveryCacheKey(kind, categorySlug);
  const cached = await getCacheValue<DiscoveryCachePayload>(cacheKey);

  if (cached) {
    return {
      computedAt: new Date(cached.computedAt),
      rows: cached.rows
    };
  }

  const latest = await prisma.discoveryInsightSnapshot.findFirst({
    where: {
      kind: kind as DiscoveryInsightKind,
      categorySlug
    },
    orderBy: {
      computedAt: "desc"
    },
    select: {
      computedAt: true
    }
  });

  if (!latest) {
    return {
      computedAt: null,
      rows: [] as DiscoveryAppResult[]
    };
  }

  const rows = await prisma.discoveryInsightSnapshot.findMany({
    where: {
      kind: kind as DiscoveryInsightKind,
      categorySlug,
      computedAt: latest.computedAt
    },
    orderBy: {
      rank: "asc"
    },
    take: options?.limit ?? 12,
    select: {
      appId: true,
      score: true,
      rank: true,
      inputsJson: true
    }
  });
  const enriched = await enrichDiscoveryRows(rows, latest.computedAt);

  await setCacheValue(
    cacheKey,
    {
      computedAt: latest.computedAt.toISOString(),
      rows: enriched
    },
    DISCOVERY_CACHE_TTL_SECONDS,
  );

  return {
    computedAt: latest.computedAt,
    rows: enriched
  };
}

export async function listDiscoveryDebugRows(kind: DiscoveryKind, options?: { categorySlug?: string | null; limit?: number }) {
  const latest = await prisma.discoveryInsightSnapshot.findFirst({
    where: {
      kind: kind as DiscoveryInsightKind,
      categorySlug: options?.categorySlug ?? null
    },
    orderBy: {
      computedAt: "desc"
    }
  });

  if (!latest) {
    return {
      computedAt: null,
      rows: [] as Array<{
        appId: string;
        appName: string;
        categorySlug: string;
        score: number;
        rank: number;
        inputsJson: unknown;
      }>
    };
  }

  const rows = await prisma.discoveryInsightSnapshot.findMany({
    where: {
      kind: kind as DiscoveryInsightKind,
      categorySlug: options?.categorySlug ?? null,
      computedAt: latest.computedAt
    },
    orderBy: {
      rank: "asc"
    },
    take: options?.limit ?? 20,
    include: {
      app: {
        select: {
          id: true,
          name: true,
          category: {
            select: {
              slug: true
            }
          }
        }
      }
    }
  });

  return {
    computedAt: latest.computedAt,
    rows: rows.map((row) => ({
      appId: row.appId,
      appName: row.app.name,
      categorySlug: row.app.category.slug,
      score: row.score,
      rank: row.rank,
      inputsJson: row.inputsJson
    }))
  };
}

export async function listDiscoveryConfigEntries() {
  const keys = [
    "discovery.weights.trending",
    "discovery.weights.rising",
    "discovery.weights.community_pick"
  ];

  const rows = await prisma.configKV.findMany({
    where: {
      key: {
        in: keys
      }
    },
    orderBy: {
      key: "asc"
    }
  });
  const rowMap = new Map(rows.map((row) => [row.key, row]));

  return [
    {
      key: "discovery.weights.trending",
      label: "Trending weights",
      valueJson: rowMap.get("discovery.weights.trending")?.valueJson ?? defaultTrendingWeights
    },
    {
      key: "discovery.weights.rising",
      label: "Rising weights",
      valueJson: rowMap.get("discovery.weights.rising")?.valueJson ?? defaultRisingWeights
    },
    {
      key: "discovery.weights.community_pick",
      label: "Community pick weights",
      valueJson: rowMap.get("discovery.weights.community_pick")?.valueJson ?? defaultCommunityPickWeights
    }
  ];
}

export async function updateDiscoveryConfig(key: string, valueJson: unknown) {
  const schema =
    key === "discovery.weights.trending"
      ? trendingWeightsSchema
      : key === "discovery.weights.rising"
        ? risingWeightsSchema
        : key === "discovery.weights.community_pick"
          ? communityPickWeightsSchema
          : null;

  if (!schema) {
    throw new Error("Unsupported discovery config key.");
  }

  const parsed = schema.safeParse(valueJson);

  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(", ") || "Invalid config value.");
  }

  await prisma.configKV.upsert({
    where: {
      key
    },
    update: {
      valueJson: parsed.data
    },
    create: {
      key,
      valueJson: parsed.data
    }
  });

  await invalidateDiscoveryCaches();
  return parsed.data;
}

export async function listSignalSnapshotHealth() {
  const latestSnapshots = await prisma.appSignalSnapshot.groupBy({
    by: ["category", "metric"],
    _max: {
      observedAt: true
    },
    _count: {
      _all: true
    }
  });

  return latestSnapshots
    .map((row) => ({
      category: row.category,
      metric: row.metric,
      count: row._count._all,
      lastObservedAt: row._max.observedAt
    }))
    .sort((left, right) => {
      if (left.category === right.category) {
        return left.metric.localeCompare(right.metric);
      }

      return left.category.localeCompare(right.category);
    });
}
