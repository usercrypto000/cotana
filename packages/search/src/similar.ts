import type { SearchCandidate } from "./index";

export function boostSimilarCandidates(
  candidates: SearchCandidate[],
  sourceCategorySlug: string,
  boostSameCategory = true,
) {
  return candidates.map((candidate) => ({
    ...candidate,
    similarity:
      candidate.similarity +
      (boostSameCategory && candidate.app.category.slug === sourceCategorySlug ? 0.05 : 0)
  }));
}
