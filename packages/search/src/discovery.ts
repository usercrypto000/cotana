export type DiscoveryNormalizedMetrics = {
  viewVelocity: number;
  clickVelocity: number;
  searchCtr: number;
  likeVelocity: number;
  reviewVelocity: number;
  signalMomentum: number;
  viewGrowth: number;
  clickGrowth: number;
  likeGrowth: number;
  reviewGrowth: number;
  ageScore: number;
  engagementQuality: number;
  ratingQuality: number;
  reviewCountQuality: number;
  moderationSafety: number;
};

export type TrendingWeights = {
  viewVelocity: number;
  searchCtr: number;
  likeVelocity: number;
  reviewVelocity: number;
  signalMomentum: number;
};

export type RisingWeights = {
  viewGrowth: number;
  clickGrowth: number;
  likeGrowth: number;
  reviewGrowth: number;
  signalMomentum: number;
  lowHistoryBoost: number;
};

export type CommunityPickWeights = {
  ratingQuality: number;
  reviewCountQuality: number;
  likeVelocity: number;
  engagementQuality: number;
  moderationSafety: number;
  minRating: number;
  minReviewCount: number;
  maxModerationRisk: number;
  scoreThreshold: number;
};

export const defaultTrendingWeights: TrendingWeights = {
  viewVelocity: 0.32,
  searchCtr: 0.18,
  likeVelocity: 0.2,
  reviewVelocity: 0.12,
  signalMomentum: 0.18
};

export const defaultRisingWeights: RisingWeights = {
  viewGrowth: 0.28,
  clickGrowth: 0.24,
  likeGrowth: 0.18,
  reviewGrowth: 0.16,
  signalMomentum: 0.08,
  lowHistoryBoost: 0.06
};

export const defaultCommunityPickWeights: CommunityPickWeights = {
  ratingQuality: 0.34,
  reviewCountQuality: 0.18,
  likeVelocity: 0.18,
  engagementQuality: 0.15,
  moderationSafety: 0.15,
  minRating: 4,
  minReviewCount: 2,
  maxModerationRisk: 0.35,
  scoreThreshold: 0.58
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function scoreTrendingCandidate(metrics: DiscoveryNormalizedMetrics, weights: TrendingWeights) {
  return (
    metrics.viewVelocity * weights.viewVelocity +
    metrics.searchCtr * weights.searchCtr +
    metrics.likeVelocity * weights.likeVelocity +
    metrics.reviewVelocity * weights.reviewVelocity +
    metrics.signalMomentum * weights.signalMomentum
  );
}

export function scoreRisingCandidate(
  metrics: DiscoveryNormalizedMetrics,
  weights: RisingWeights,
  options?: { lowHistory?: boolean },
) {
  const lowHistoryBoost = options?.lowHistory ? weights.lowHistoryBoost : 0;

  return (
    metrics.viewGrowth * weights.viewGrowth +
    metrics.clickGrowth * weights.clickGrowth +
    metrics.likeGrowth * weights.likeGrowth +
    metrics.reviewGrowth * weights.reviewGrowth +
    metrics.signalMomentum * weights.signalMomentum +
    lowHistoryBoost
  );
}

export function scoreCommunityPickCandidate(
  metrics: DiscoveryNormalizedMetrics,
  weights: CommunityPickWeights,
) {
  return (
    metrics.ratingQuality * weights.ratingQuality +
    metrics.reviewCountQuality * weights.reviewCountQuality +
    metrics.likeVelocity * weights.likeVelocity +
    metrics.engagementQuality * weights.engagementQuality +
    metrics.moderationSafety * weights.moderationSafety
  );
}

export function qualifiesCommunityPick(
  metrics: DiscoveryNormalizedMetrics,
  input: {
    averageRating: number;
    reviewCount: number;
    moderationRisk: number;
  },
  weights: CommunityPickWeights,
) {
  if (input.averageRating < weights.minRating) {
    return false;
  }

  if (input.reviewCount < weights.minReviewCount) {
    return false;
  }

  if (input.moderationRisk > weights.maxModerationRisk) {
    return false;
  }

  return scoreCommunityPickCandidate(metrics, weights) >= weights.scoreThreshold;
}

export function normalizeMetricMap(values: Record<string, number>) {
  const maxValue = Math.max(...Object.values(values), 0);

  if (maxValue <= 0) {
    return Object.fromEntries(Object.keys(values).map((key) => [key, 0])) as Record<string, number>;
  }

  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, clamp(value / maxValue)]),
  );
}

export function safeGrowthRate(current: number, previous: number) {
  if (current <= 0 && previous <= 0) {
    return 0;
  }

  return clamp((current - previous) / Math.max(previous, 1), 0, 1.5);
}

export function moderationSafetyScore(risk: number) {
  return clamp(1 - risk);
}

export function ageScore(ageInDays: number) {
  if (ageInDays <= 0) {
    return 0;
  }

  return clamp(Math.min(ageInDays, 180) / 180);
}
