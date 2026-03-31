import { AppStatus, ReviewStatus, prisma } from "@cotana/db";
import { getCounterValue } from "@cotana/db/redis";
import type { AppSummary, CandidateScoreInput, CategorySignalMap, SearchCategoryHint } from "@cotana/types";
import OpenAI from "openai";
import { z } from "zod";

const EMBEDDING_DIMENSIONS = 1536;
const PAGE_VELOCITY_WINDOW_DAYS = 7;
const DEFAULT_RETRIEVAL_LIMIT = 24;

const configSchema = z.object({
  similarityWeight: z.number().min(0),
  ratingWeight: z.number().min(0),
  reviewWeight: z.number().min(0),
  likesWeight: z.number().min(0),
  pageVelocityWeight: z.number().min(0),
  signalWeights: z.record(z.string(), z.number()).optional().default({})
});

type RankingConfig = z.infer<typeof configSchema>;

type EmbeddableApp = {
  id: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  category: {
    slug: string;
    name: string;
    sortOrder: number;
  };
  tags?: string[];
};

export type SearchCandidate = {
  app: AppSummary;
  similarity: number;
  stats: {
    averageRating: number;
    reviewCount: number;
    likes: number;
    pageViewVelocity: number;
  };
  signals: CategorySignalMap;
  score?: number;
};

type CandidateRow = {
  appId: string;
  similarity: number;
};

const DEFAULT_RANKING_CONFIG: RankingConfig = {
  similarityWeight: 0.55,
  ratingWeight: 0.1,
  reviewWeight: 0.1,
  likesWeight: 0.1,
  pageVelocityWeight: 0.1,
  signalWeights: {
    tvl: 0.025,
    apy: 0.025
  }
};

const CATEGORY_RANKING_CONFIG: Record<Exclude<SearchCategoryHint, null>, RankingConfig> = {
  defi: {
    ...DEFAULT_RANKING_CONFIG,
    signalWeights: {
      tvl: 0.05,
      volume: 0.04,
      liquidity_depth: 0.03
    }
  },
  "lending-yield": {
    ...DEFAULT_RANKING_CONFIG,
    signalWeights: {
      apy: 0.05,
      tvl: 0.035,
      protocol_age: 0.02,
      supported_asset_count: 0.025
    }
  },
  "prediction-markets": {
    ...DEFAULT_RANKING_CONFIG,
    signalWeights: {
      open_interest: 0.05,
      active_markets: 0.03,
      resolved_market_volume: 0.03
    }
  },
  social: {
    ...DEFAULT_RANKING_CONFIG,
    signalWeights: {
      monthly_active_wallets: 0.05,
      interaction_volume: 0.04
    }
  },
  gaming: {
    ...DEFAULT_RANKING_CONFIG,
    signalWeights: {
      daily_active_wallets: 0.05,
      transaction_frequency: 0.04
    }
  },
  staking: {
    ...DEFAULT_RANKING_CONFIG,
    signalWeights: {
      apr: 0.05,
      supported_assets: 0.03,
      validator_count: 0.03
    }
  }
};

const CATEGORY_HINT_RULES: Array<{
  category: Exclude<SearchCategoryHint, null>;
  keywords: string[];
}> = [
  {
    category: "lending-yield",
    keywords: ["yield", "apy", "apr", "lending", "earn", "savings", "stablecoin"]
  },
  {
    category: "prediction-markets",
    keywords: ["prediction", "market", "markets", "forecast", "event", "bet", "odds"]
  },
  {
    category: "defi",
    keywords: ["defi", "liquidity", "swap", "tvl", "protocol", "dex"]
  },
  {
    category: "social",
    keywords: ["social", "community", "creator", "feed", "messaging"]
  },
  {
    category: "gaming",
    keywords: ["gaming", "game", "play", "quest", "guild"]
  },
  {
    category: "staking",
    keywords: ["staking", "validator", "stake"]
  }
];

function getEmbeddingModel() {
  return process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-large";
}

function normalizeQuery(query: string) {
  return query.trim().toLowerCase();
}

function hashToken(token: string) {
  let hash = 2166136261;

  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function normalizeVector(vector: number[]) {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value ** 2, 0));

  if (magnitude === 0) {
    return vector;
  }

  return vector.map((value) => value / magnitude);
}

function fallbackEmbedText(text: string) {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

  if (tokens.length === 0) {
    vector[0] = 1;
    return vector;
  }

  for (const token of tokens) {
    const index = hashToken(token) % EMBEDDING_DIMENSIONS;
    vector[index] += 1;
  }

  return normalizeVector(vector);
}

function serializeVector(vector: number[]) {
  return `[${vector.map((value) => Number(value.toFixed(8))).join(",")}]`;
}

function inferCategoryHint(query: string): SearchCategoryHint {
  const normalized = normalizeQuery(query);

  for (const rule of CATEGORY_HINT_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.category;
    }
  }

  return null;
}

function pickConfig(categoryHint: SearchCategoryHint) {
  if (!categoryHint) {
    return DEFAULT_RANKING_CONFIG;
  }

  return CATEGORY_RANKING_CONFIG[categoryHint] ?? DEFAULT_RANKING_CONFIG;
}

async function loadRankingConfig(categoryHint: SearchCategoryHint): Promise<RankingConfig> {
  const configKey = categoryHint ? `ranking.weights.${categoryHint}` : "ranking.weights.default";
  const configRow = await prisma.configKV.findUnique({
    where: {
      key: configKey
    }
  });

  if (!configRow) {
    return pickConfig(categoryHint);
  }

  const parsed = configSchema.safeParse(configRow.valueJson);
  return parsed.success ? parsed.data : pickConfig(categoryHint);
}

function normalizeNumberMap(values: Record<string, number>) {
  const maxValue = Math.max(...Object.values(values), 0);

  if (maxValue <= 0) {
    return values;
  }

  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value / maxValue]));
}

async function getEmbeddableApp(appId: string) {
  return prisma.app.findUnique({
    where: {
      id: appId
    },
    include: {
      category: true,
      tags: {
        orderBy: {
          tag: "asc"
        }
      }
    }
  });
}

async function getReviewStats(appIds: string[]) {
  if (appIds.length === 0) {
    return new Map<string, { averageRating: number; reviewCount: number }>();
  }

  const stats = await prisma.review.groupBy({
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
  });

  return new Map(
    stats.map((row) => [
      row.appId,
      {
        averageRating: row._avg.rating ?? 0,
        reviewCount: row._count._all
      }
    ]),
  );
}

async function getLikeCounts(appIds: string[]) {
  if (appIds.length === 0) {
    return new Map<string, number>();
  }

  const counts = await prisma.appLike.groupBy({
    by: ["appId"],
    where: {
      appId: {
        in: appIds
      }
    },
    _count: {
      _all: true
    }
  });

  return new Map(counts.map((row) => [row.appId, row._count._all]));
}

async function getPageViewVelocity(appIds: string[]) {
  if (appIds.length === 0) {
    return new Map<string, number>();
  }

  const counterEntries = await Promise.all(
    appIds.map(async (appId) => [appId, await getCounterValue(`page-velocity:${appId}`)] as const),
  );
  const counterMap = new Map(counterEntries);
  const missingIds = appIds.filter((appId) => typeof counterMap.get(appId) !== "number");

  if (missingIds.length === 0) {
    return new Map(
      appIds.map((appId) => [appId, counterMap.get(appId) ?? 0]),
    );
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PAGE_VELOCITY_WINDOW_DAYS);

  const counts = await prisma.appView.groupBy({
    by: ["appId"],
    where: {
      appId: {
        in: missingIds
      },
      createdAt: {
        gte: cutoff
      }
    },
    _count: {
      _all: true
    }
  });
  const dbMap = new Map(counts.map((row) => [row.appId, row._count._all]));

  return new Map(
    appIds.map((appId) => [appId, counterMap.get(appId) ?? dbMap.get(appId) ?? 0]),
  );
}

async function getLatestSignals(appIds: string[]) {
  if (appIds.length === 0) {
    return new Map<string, CategorySignalMap>();
  }

  const rows = await prisma.appSignal.findMany({
    where: {
      appId: {
        in: appIds
      },
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

  const map = new Map<string, CategorySignalMap>();

  for (const row of rows) {
    const current = map.get(row.appId) ?? {};

    if (typeof current[row.signalKey] !== "number" && typeof row.numericValue === "number") {
      current[row.signalKey] = row.numericValue;
      map.set(row.appId, current);
    }
  }

  return map;
}

async function buildCandidateSummaries(rows: CandidateRow[]) {
  if (rows.length === 0) {
    return [];
  }

  const appIds = rows.map((row) => row.appId);
  const apps = await prisma.app.findMany({
    where: {
      id: {
        in: appIds
      },
      status: AppStatus.PUBLISHED
    },
    include: {
      category: true
    }
  });

  const orderMap = new Map(rows.map((row) => [row.appId, row.similarity]));
  const reviewStats = await getReviewStats(appIds);
  const likeCounts = await getLikeCounts(appIds);
  const pageVelocity = await getPageViewVelocity(appIds);
  const signals = await getLatestSignals(appIds);

  return apps
    .map<SearchCandidate>((app) => ({
      app: {
        id: app.id,
        slug: app.slug,
        name: app.name,
        logoUrl: app.logoUrl,
        verified: app.verified,
        shortDescription: app.shortDescription,
        longDescription: app.longDescription,
        category: app.category,
        rating: reviewStats.get(app.id)?.averageRating ?? 0,
        reviewCount: reviewStats.get(app.id)?.reviewCount ?? 0,
        likeCount: likeCounts.get(app.id) ?? 0
      },
      similarity: orderMap.get(app.id) ?? 0,
      stats: {
        averageRating: reviewStats.get(app.id)?.averageRating ?? 0,
        reviewCount: reviewStats.get(app.id)?.reviewCount ?? 0,
        likes: likeCounts.get(app.id) ?? 0,
        pageViewVelocity: pageVelocity.get(app.id) ?? 0
      },
      signals: signals.get(app.id) ?? {}
    }))
    .sort((left, right) => (orderMap.get(right.app.id) ?? 0) - (orderMap.get(left.app.id) ?? 0));
}

export function buildAppEmbeddingText(app: Pick<EmbeddableApp, "name" | "shortDescription" | "longDescription" | "category" | "tags">) {
  return [
    `Name: ${app.name}`,
    `Short description: ${app.shortDescription}`,
    `Long description: ${app.longDescription}`,
    `Category: ${app.category.name}`,
    app.tags && app.tags.length > 0 ? `Tags: ${app.tags.join(", ")}` : null
  ]
    .filter(Boolean)
    .join("\n");
}

export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallbackEmbedText(text);
  }

  const client = new OpenAI({
    apiKey
  });

  const response = await client.embeddings.create({
    model: getEmbeddingModel(),
    input: text,
    dimensions: EMBEDDING_DIMENSIONS
  });

  return response.data[0]?.embedding ?? fallbackEmbedText(text);
}

export async function upsertAppEmbedding(appId: string) {
  const app = await getEmbeddableApp(appId);

  if (!app) {
    return null;
  }

  const sourceText = buildAppEmbeddingText({
    ...app,
    tags: app.tags.map((tag) => tag.tag)
  });
  const embedding = await embedText(sourceText);
  const vector = serializeVector(embedding);

  await prisma.$executeRaw`
    INSERT INTO "AppEmbedding" ("id", "appId", "embedding", "embeddingModel", "sourceText", "updatedAt")
    VALUES (${crypto.randomUUID()}, ${app.id}, ${vector}::vector, ${getEmbeddingModel()}, ${sourceText}, NOW())
    ON CONFLICT ("appId")
    DO UPDATE SET
      "embedding" = ${vector}::vector,
      "embeddingModel" = ${getEmbeddingModel()},
      "sourceText" = ${sourceText},
      "updatedAt" = NOW()
  `;

  return {
    appId: app.id,
    sourceText,
    embeddingModel: getEmbeddingModel()
  };
}

export async function ensurePublishedAppEmbeddings(limit = 50) {
  const appsWithoutEmbeddings = await prisma.app.findMany({
    where: {
      status: AppStatus.PUBLISHED,
      embedding: null
    },
    select: {
      id: true
    },
    take: limit
  });

  for (const app of appsWithoutEmbeddings) {
    await upsertAppEmbedding(app.id);
  }

  return appsWithoutEmbeddings.length;
}

export async function retrieveCandidates(
  queryEmbedding: number[],
  limit: number,
  filters?: {
    categorySlug?: string;
  },
): Promise<SearchCandidate[]> {
  const vector = serializeVector(queryEmbedding);
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        ae."appId" AS "appId",
        1 - (ae."embedding" <=> $1::vector) AS "similarity"
      FROM "AppEmbedding" ae
      INNER JOIN "App" a ON a."id" = ae."appId"
      INNER JOIN "Category" c ON c."id" = a."categoryId"
      WHERE a."status" = 'PUBLISHED'
      ${filters?.categorySlug && filters.categorySlug !== "all" ? `AND c."slug" = '${filters.categorySlug.replace(/'/g, "''")}'` : ""}
      ORDER BY ae."embedding" <=> $1::vector ASC
      LIMIT $2
    `,
    vector,
    limit,
  )) as CandidateRow[];

  return buildCandidateSummaries(rows);
}

export function scoreCandidate(
  _app: AppSummary,
  { similarity, stats, signals }: CandidateScoreInput,
  config: RankingConfig,
) {
  const signalScore = Object.entries(signals).reduce((total, [key, value]) => {
    return total + value * (config.signalWeights?.[key] ?? 0);
  }, 0);

  return (
    similarity * config.similarityWeight +
    stats.averageRating * config.ratingWeight +
    stats.reviewCount * config.reviewWeight +
    stats.likes * config.likesWeight +
    stats.pageViewVelocity * config.pageVelocityWeight +
    signalScore
  );
}

export async function rerankCandidates(candidates: SearchCandidate[], categoryHint: SearchCategoryHint) {
  const config = await loadRankingConfig(categoryHint);
  const normalizedSimilarity = normalizeNumberMap(
    Object.fromEntries(candidates.map((candidate) => [candidate.app.id, candidate.similarity])),
  );
  const normalizedReviewCount = normalizeNumberMap(
    Object.fromEntries(candidates.map((candidate) => [candidate.app.id, candidate.stats.reviewCount])),
  );
  const normalizedLikes = normalizeNumberMap(
    Object.fromEntries(candidates.map((candidate) => [candidate.app.id, candidate.stats.likes])),
  );
  const normalizedPageVelocity = normalizeNumberMap(
    Object.fromEntries(candidates.map((candidate) => [candidate.app.id, candidate.stats.pageViewVelocity])),
  );

  const signalKeys = [...new Set(candidates.flatMap((candidate) => Object.keys(candidate.signals)))];
  const normalizedSignalsByKey = new Map<string, Record<string, number>>();

  for (const signalKey of signalKeys) {
    normalizedSignalsByKey.set(
      signalKey,
      normalizeNumberMap(
        Object.fromEntries(candidates.map((candidate) => [candidate.app.id, candidate.signals[signalKey] ?? 0])),
      ),
    );
  }

  return [...candidates]
    .map((candidate) => {
      const normalizedSignals = Object.fromEntries(
        signalKeys.map((signalKey) => [signalKey, normalizedSignalsByKey.get(signalKey)?.[candidate.app.id] ?? 0]),
      );

      const score = scoreCandidate(
        candidate.app,
        {
          similarity: normalizedSimilarity[candidate.app.id] ?? 0,
          stats: {
            averageRating: candidate.stats.averageRating / 5,
            reviewCount: normalizedReviewCount[candidate.app.id] ?? 0,
            likes: normalizedLikes[candidate.app.id] ?? 0,
            pageViewVelocity: normalizedPageVelocity[candidate.app.id] ?? 0
          },
          signals: normalizedSignals
        },
        config,
      );

      return {
        ...candidate,
        score
      };
    })
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0));
}

export async function searchApps(
  query: string,
  options?: {
    limit?: number;
    categorySlug?: string;
  },
) {
  const normalizedQuery = normalizeQuery(query);

  if (!normalizedQuery) {
    return {
      query: normalizedQuery,
      categoryHint: options?.categorySlug && options.categorySlug !== "all" ? (options.categorySlug as SearchCategoryHint) : null,
      results: [] as SearchCandidate[]
    };
  }

  await ensurePublishedAppEmbeddings();

  const queryEmbedding = await embedText(normalizedQuery);
  const categoryHint =
    options?.categorySlug && options.categorySlug !== "all"
      ? (options.categorySlug as SearchCategoryHint)
      : inferCategoryHint(normalizedQuery);
  const candidates = await retrieveCandidates(queryEmbedding, options?.limit ?? DEFAULT_RETRIEVAL_LIMIT, {
    categorySlug: options?.categorySlug
  });
  const reranked = await rerankCandidates(candidates, categoryHint);

  return {
    query: normalizedQuery,
    categoryHint,
    results: reranked
  };
}

export async function getSimilarApps(appId: string) {
  const embeddingRow = (await prisma.$queryRawUnsafe(
    `
      SELECT "appId", "embedding"::text AS "embedding"
      FROM "AppEmbedding"
      WHERE "appId" = $1
      LIMIT 1
    `,
    appId,
  )) as Array<{ appId: string; embedding: string }>;

  if (embeddingRow.length === 0) {
    await upsertAppEmbedding(appId);
  }

  const currentRow = (await prisma.$queryRawUnsafe(
    `
      SELECT "appId", "embedding"::text AS "embedding"
      FROM "AppEmbedding"
      WHERE "appId" = $1
      LIMIT 1
    `,
    appId,
  )) as Array<{ appId: string; embedding: string }>;

  const vector = currentRow[0]?.embedding;

  if (!vector) {
    return [];
  }

  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        ae."appId" AS "appId",
        1 - (ae."embedding" <=> $1::vector) AS "similarity"
      FROM "AppEmbedding" ae
      INNER JOIN "App" a ON a."id" = ae."appId"
      WHERE a."status" = 'PUBLISHED' AND ae."appId" <> $2
      ORDER BY ae."embedding" <=> $1::vector ASC
      LIMIT 4
    `,
    vector,
    appId,
  )) as CandidateRow[];

  const candidates = await buildCandidateSummaries(rows);
  return candidates.map((candidate) => candidate.app);
}
