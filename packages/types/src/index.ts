export type CategoryDefinition = {
  slug: string;
  name: string;
  sortOrder: number;
};

export type AppVerificationStatus = "verified" | "reviewed" | "unreviewed" | "experimental";

export type AppPublisherType = "team" | "individual" | "protocol" | "unknown";

export type AppTrustMetadata = {
  verificationStatus: AppVerificationStatus;
  publisherName: string;
  publisherType: AppPublisherType;
  supportedChains: string[];
  permissionScopes: string[];
  paymentCapabilities: string[];
  custodyModel: string;
  externalRiskNotes: string;
  lastReviewedAt: Date | null;
  reviewSummary: string;
};

export const fallbackTrustMetadata: AppTrustMetadata = {
  verificationStatus: "unreviewed",
  publisherName: "Unknown publisher",
  publisherType: "unknown",
  supportedChains: ["Not specified"],
  permissionScopes: ["Not specified"],
  paymentCapabilities: ["None listed"],
  custodyModel: "Not specified",
  externalRiskNotes: "No external risk notes recorded.",
  lastReviewedAt: null,
  reviewSummary: "Cotana has not completed a full trust review for this app."
};

export function normalizeTrustMetadata(
  metadata?: Partial<AppTrustMetadata> | null,
  legacy?: {
    verified?: boolean;
    lastReviewedAt?: Date | null;
  },
): AppTrustMetadata {
  const verificationStatus =
    metadata?.verificationStatus ??
    (legacy?.verified ? "verified" : fallbackTrustMetadata.verificationStatus);

  return {
    verificationStatus,
    publisherName: metadata?.publisherName?.trim() || fallbackTrustMetadata.publisherName,
    publisherType: metadata?.publisherType ?? fallbackTrustMetadata.publisherType,
    supportedChains: metadata?.supportedChains?.length ? metadata.supportedChains : fallbackTrustMetadata.supportedChains,
    permissionScopes: metadata?.permissionScopes?.length ? metadata.permissionScopes : fallbackTrustMetadata.permissionScopes,
    paymentCapabilities: metadata?.paymentCapabilities?.length ? metadata.paymentCapabilities : fallbackTrustMetadata.paymentCapabilities,
    custodyModel: metadata?.custodyModel?.trim() || fallbackTrustMetadata.custodyModel,
    externalRiskNotes: metadata?.externalRiskNotes?.trim() || fallbackTrustMetadata.externalRiskNotes,
    lastReviewedAt: metadata?.lastReviewedAt ?? legacy?.lastReviewedAt ?? fallbackTrustMetadata.lastReviewedAt,
    reviewSummary: metadata?.reviewSummary?.trim() || fallbackTrustMetadata.reviewSummary
  };
}

export type AppSummary = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
  verified: boolean;
  isCommunityPick: boolean;
  shortDescription: string;
  longDescription: string;
  publishedAt: Date | null;
  category: CategoryDefinition;
  rating: number;
  reviewCount: number;
  likeCount: number;
  trustMetadata?: AppTrustMetadata;
};



export type SearchCategoryHint =
  | "defi"
  | "lending-yield"
  | "prediction-markets"
  | "social"
  | "gaming"
  | "staking"
  | null;

export type SearchSort = "relevance" | "highest-rated" | "most-reviewed" | "trending" | "newest";

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

export type DiscoveryKind = "TRENDING" | "RISING" | "COMMUNITY_PICK";

export type DiscoveryScoreInputs = {
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
