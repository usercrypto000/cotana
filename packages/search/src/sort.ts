import type { SearchSort } from "@cotana/types";
import type { SearchCandidate } from "./index";

export function sortSearchCandidateList(
  candidates: SearchCandidate[],
  sort: SearchSort,
  trendingScores?: Map<string, number>,
) {
  if (sort === "relevance") {
    return candidates;
  }

  if (sort === "highest-rated") {
    return [...candidates].sort(
      (left, right) => right.app.rating - left.app.rating || (right.score ?? 0) - (left.score ?? 0),
    );
  }

  if (sort === "most-reviewed") {
    return [...candidates].sort(
      (left, right) => right.app.reviewCount - left.app.reviewCount || (right.score ?? 0) - (left.score ?? 0),
    );
  }

  if (sort === "newest") {
    return [...candidates].sort((left, right) => {
      const rightTime = right.app.publishedAt ? new Date(right.app.publishedAt).getTime() : 0;
      const leftTime = left.app.publishedAt ? new Date(left.app.publishedAt).getTime() : 0;
      return rightTime - leftTime || (right.score ?? 0) - (left.score ?? 0);
    });
  }

  return [...candidates].sort((left, right) => {
    const rightTrending = trendingScores?.get(right.app.id) ?? 0;
    const leftTrending = trendingScores?.get(left.app.id) ?? 0;
    return rightTrending - leftTrending || (right.score ?? 0) - (left.score ?? 0);
  });
}
