export type CategoryDefinition = {
  slug: string;
  name: string;
  sortOrder: number;
};

export type AppSummary = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
  verified: boolean;
  shortDescription: string;
  longDescription: string;
  category: CategoryDefinition;
  rating: number;
  reviewCount: number;
  likeCount: number;
};

export type SearchCategoryHint =
  | "defi"
  | "lending-yield"
  | "prediction-markets"
  | "social"
  | "gaming"
  | "staking"
  | null;

export type CandidateStats = {
  averageRating: number;
  reviewCount: number;
  likes: number;
  pageViewVelocity: number;
};

export type CategorySignalMap = Record<string, number>;

export type CandidateScoreInput = {
  similarity: number;
  stats: CandidateStats;
  signals: CategorySignalMap;
};

export type ReviewEligibility = {
  allowed: boolean;
  reasons: string[];
  nextEligibleAt: Date | null;
};
