import type { SearchCandidate } from "./index";
import { boostSimilarCandidates } from "./similar";

function candidate(id: string, categorySlug: string, similarity: number): SearchCandidate {
  return {
    app: {
      id,
      slug: id,
      name: id,
      logoUrl: "",
      verified: false,
      agentAudience: "HUMAN",
      communityPick: false,
      shortDescription: "",
      longDescription: "",
      publishedAt: new Date("2026-03-01T00:00:00.000Z"),
      category: {
        slug: categorySlug,
        name: categorySlug,
        sortOrder: 1
      },
      rating: 4,
      reviewCount: 10,
      likeCount: 3
    },
    similarity,
    stats: {
      averageRating: 4,
      reviewCount: 10,
      likes: 3,
      pageViewVelocity: 5
    },
    signals: {}
  };
}

describe("similar app ranking", () => {
  it("boosts candidates from the same category", () => {
    const results = boostSimilarCandidates(
      [
        candidate("same", "defi", 0.4),
        candidate("other", "social", 0.4)
      ],
      "defi",
      true,
    );

    expect(results.find((entry) => entry.app.id === "same")?.similarity).toBeCloseTo(0.45, 5);
    expect(results.find((entry) => entry.app.id === "other")?.similarity).toBeCloseTo(0.4, 5);
  });
});
