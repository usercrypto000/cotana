import type { SearchCandidate } from "./index";
import { sortSearchCandidateList } from "./sort";

function candidate(id: string, overrides?: Partial<SearchCandidate>): SearchCandidate {
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
        slug: "defi",
        name: "DeFi",
        sortOrder: 1
      },
      rating: 4,
      reviewCount: 10,
      likeCount: 3
    },
    similarity: 0.5,
    stats: {
      averageRating: 4,
      reviewCount: 10,
      likes: 3,
      pageViewVelocity: 5
    },
    signals: {},
    score: 0.5,
    ...overrides
  };
}

describe("search sorts", () => {
  it("sorts by highest rated", () => {
    const results = sortSearchCandidateList(
      [
        candidate("a", { app: { ...candidate("a").app, rating: 4.1 } }),
        candidate("b", { app: { ...candidate("b").app, rating: 4.8 } })
      ],
      "highest-rated",
    );

    expect(results.map((entry) => entry.app.id)).toEqual(["b", "a"]);
  });

  it("sorts by newest publish date", () => {
    const results = sortSearchCandidateList(
      [
        candidate("older", { app: { ...candidate("older").app, publishedAt: new Date("2026-03-01T00:00:00.000Z") } }),
        candidate("newer", { app: { ...candidate("newer").app, publishedAt: new Date("2026-03-30T00:00:00.000Z") } })
      ],
      "newest",
    );

    expect(results.map((entry) => entry.app.id)).toEqual(["newer", "older"]);
  });

  it("sorts by trending score map", () => {
    const results = sortSearchCandidateList(
      [candidate("a"), candidate("b")],
      "trending",
      new Map([
        ["a", 0.2],
        ["b", 0.9]
      ]),
    );

    expect(results.map((entry) => entry.app.id)).toEqual(["b", "a"]);
  });
});
