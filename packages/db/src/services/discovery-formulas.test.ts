import {
  defaultCommunityPickWeights,
  defaultRisingWeights,
  defaultTrendingWeights,
  qualifiesCommunityPick,
  scoreRisingCandidate,
  scoreTrendingCandidate
} from "./discovery-formulas";

describe("discovery formulas", () => {
  const baseMetrics = {
    viewVelocity: 0.8,
    clickVelocity: 0.6,
    searchCtr: 0.7,
    likeVelocity: 0.5,
    reviewVelocity: 0.4,
    signalMomentum: 0.3,
    viewGrowth: 0.9,
    clickGrowth: 0.75,
    likeGrowth: 0.5,
    reviewGrowth: 0.35,
    ageScore: 0.4,
    engagementQuality: 0.7,
    ratingQuality: 0.9,
    reviewCountQuality: 0.5,
    moderationSafety: 0.95
  } as const;

  it("computes a deterministic trending score", () => {
    const score = scoreTrendingCandidate(baseMetrics, defaultTrendingWeights);
    expect(score).toBeCloseTo(0.584, 3);
  });

  it("rewards low-history acceleration in rising", () => {
    const withoutBoost = scoreRisingCandidate(baseMetrics, defaultRisingWeights, { lowHistory: false });
    const withBoost = scoreRisingCandidate(baseMetrics, defaultRisingWeights, { lowHistory: true });

    expect(withBoost).toBeGreaterThan(withoutBoost);
    expect(withBoost - withoutBoost).toBeCloseTo(defaultRisingWeights.lowHistoryBoost, 5);
  });

  it("requires community picks to clear rating, review count, and moderation thresholds", () => {
    const allowed = qualifiesCommunityPick(
      baseMetrics,
      {
        averageRating: 4.6,
        reviewCount: 5,
        moderationRisk: 0.1
      },
      defaultCommunityPickWeights,
    );
    const blocked = qualifiesCommunityPick(
      baseMetrics,
      {
        averageRating: 4.6,
        reviewCount: 5,
        moderationRisk: 0.8
      },
      defaultCommunityPickWeights,
    );

    expect(allowed).toBe(true);
    expect(blocked).toBe(false);
  });
});
