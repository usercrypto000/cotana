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
    agentAudience?: AppAudience;
  },
): AppTrustMetadata {
  const verificationStatus =
    metadata?.verificationStatus ??
    (legacy?.verified ? "verified" : legacy?.agentAudience === "AGENT" ? "experimental" : fallbackTrustMetadata.verificationStatus);

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
  communityPick: boolean;
  agentAudience: AppAudience;
  shortDescription: string;
  longDescription: string;
  publishedAt: Date | null;
  category: CategoryDefinition;
  rating: number;
  reviewCount: number;
  likeCount: number;
  trustMetadata?: AppTrustMetadata;
};

export type AppAudience = "HUMAN" | "AGENT" | "HYBRID";

export type AgentListingStatus = "NOT_APPLICABLE" | "DRAFT" | "PUBLISHED" | "PAUSED";

export type AgentAuthType = "NONE" | "API_KEY" | "OAUTH2" | "MCP" | "CUSTOM";

export type AgentInterfaceType = "HTTP_API" | "MCP_SERVER" | "SDK" | "WEBHOOK" | "DATA_FEED" | "DOCS_ONLY";

export type AgentInteractionMode = "READ_ONLY" | "WRITE_ACTION" | "TRANSACTIONAL" | "HUMAN_HANDOFF";

export type AgentCapabilityStatus = "ACTIVE" | "PAUSED" | "DEPRECATED";

export type AgentCapabilitySummary = {
  id: string;
  name: string;
  slug: string;
  description: string;
  capabilityType: string;
  authType: AgentAuthType;
  interfaceType: AgentInterfaceType;
  interactionMode: AgentInteractionMode;
  endpointUrl: string | null;
  docsUrl: string | null;
  inputSchemaJson: unknown | null;
  outputSchemaJson: unknown | null;
  safetyNotes: string | null;
  status: AgentCapabilityStatus;
  reliabilityScore: number | null;
  latencyP50Ms: number | null;
  manifestVersion: number;
  updatedAt: Date;
  lastReviewedAt: Date | null;
  deprecatedAt: Date | null;
  deprecationReason: string | null;
  replacementCapabilityId: string | null;
  replacementDocsUrl: string | null;
};

export type AgentCapabilityQualitySignals = {
  schemaComplete: boolean;
  safetyNotesPresent: boolean;
  docsAvailable: boolean;
  endpointAvailable: boolean;
  authFriction: "none" | "low" | "medium" | "high";
  latencyTier: "fast" | "standard" | "slow" | "unknown";
  reliabilityTier: "high" | "medium" | "low" | "unknown";
  interactionSafety: "read_only" | "human_handoff" | "write_capable" | "transactional";
  qualityScore: number;
  qualityGrade: "excellent" | "good" | "needs_metadata" | "unsafe";
};

export type AgentManifestQualityWarning =
  | "deprecated"
  | "docs_missing"
  | "schema_partial"
  | "reliability_unknown"
  | "human_handoff_required"
  | "read_only_only";

export type AgentRegistryReadinessBucket =
  | "ready"
  | "needs_metadata"
  | "unsafe_interaction_mode"
  | "missing_schema"
  | "missing_safety_notes"
  | "weak_docs"
  | "low_reliability";

export type AgentRegistryApp = {
  id: string;
  slug: string;
  name: string;
  description: string;
  longDescription: string;
  websiteUrl: string;
  logoUrl: string;
  verified: boolean;
  communityPick: boolean;
  agentAudience: Exclude<AppAudience, "HUMAN">;
  agentListingStatus: "PUBLISHED";
  agentSummary: string;
  agentDocsUrl: string | null;
  manifestVersion: number;
  updatedAt: Date;
  lastReviewedAt: Date | null;
  category: Pick<CategoryDefinition, "slug" | "name">;
  capabilities: AgentCapabilitySummary[];
};

export type AgentRegistryManifest = {
  version: string;
  purpose: "discovery";
  app: AgentRegistryApp;
  qualityWarnings: AgentManifestQualityWarning[];
  trustBoundary: {
    cotanaRole: "DISCOVERY_ONLY";
    execution: "EXTERNAL_APP";
    credentialHandling: "NOT_HANDLED_BY_COTANA";
  };
};

export type AgentCapabilityManifest = {
  version: string;
  purpose: "discovery";
  app: Omit<AgentRegistryApp, "capabilities">;
  capability: AgentCapabilitySummary;
  qualitySignals: AgentCapabilityQualitySignals;
  qualityWarnings: AgentManifestQualityWarning[];
  usageBoundary: {
    cotanaCanExecute: false;
    credentialHandling: "EXTERNAL_APP";
    requiredNextStep: "READ_TARGET_APP_DOCS";
  };
  trustBoundary: AgentRegistryManifest["trustBoundary"];
};

export type AgentMatchedCapability = AgentCapabilitySummary & {
  matchScore: number;
  similarity: number;
  matchReason: string;
  qualitySignals: AgentCapabilityQualitySignals;
};

export type AgentRegistrySearchResult = {
  app: AgentRegistryApp;
  matchedCapabilities: AgentMatchedCapability[];
  score: number;
  matchReason: string;
};

export type AgentRegistrySearchFilters = {
  authTypes?: AgentAuthType[];
  interfaceTypes?: AgentInterfaceType[];
  interactionModes?: AgentInteractionMode[];
};

export type AgentRegistryCapabilityTaxonomyRow = {
  capabilityType: string;
  capabilityCount: number;
  appCount: number;
  categories: Array<Pick<CategoryDefinition, "slug" | "name"> & { capabilityCount: number }>;
  authTypes: Record<AgentAuthType, number>;
  interfaceTypes: Record<AgentInterfaceType, number>;
  interactionModes: Record<AgentInteractionMode, number>;
};

export type AgentRegistryCompatibilityReport = {
  filters: AgentRegistrySearchFilters & {
    categorySlug?: string | null;
  };
  totals: {
    appCount: number;
    capabilityCount: number;
  };
  compatible: {
    appCount: number;
    capabilityCount: number;
  };
  coverageRatio: number;
  compatibilityConfidence: {
    score: number;
    grade: "high" | "medium" | "low";
    reasons: string[];
    blockingGaps: string[];
    recommendedFilterChanges: string[];
  };
  guidance: string;
};

export type AgentRegistryQualitySummary = {
  totalListings: number;
  readyListings: number;
  needsWorkListings: number;
  averageReadinessScore: number;
  blockingIssueCount: number;
  statusCounts: Record<AgentRegistryReadinessBucket, number>;
  topIssues: Array<{
    issue: string;
    count: number;
  }>;
};

export type AgentCapabilityQualityDistribution = {
  totalCapabilities: number;
  pausedCapabilityCount: number;
  deprecatedCapabilityCount: number;
  gradeCounts: Record<AgentCapabilityQualitySignals["qualityGrade"], number>;
  readinessBucketCounts: Record<AgentRegistryReadinessBucket, number>;
  capabilityTypeCounts: Record<string, number>;
  authTypeCounts: Record<AgentAuthType, number>;
  interfaceTypeCounts: Record<AgentInterfaceType, number>;
  interactionModeCounts: Record<AgentInteractionMode, number>;
  listingStatusCounts: Record<AgentListingStatus, number>;
  nonReadOnlyCapabilities: Array<{
    appId: string;
    appSlug: string;
    appName: string;
    capabilityId: string;
    capabilitySlug: string;
    capabilityName: string;
    interactionMode: AgentInteractionMode;
    readinessBucket: AgentRegistryReadinessBucket;
  }>;
  matrix: Array<{
    grade: AgentCapabilityQualitySignals["qualityGrade"];
    readinessBucket: AgentRegistryReadinessBucket;
    count: number;
  }>;
};

export type AgentRegistryExcludedCandidate = {
  appId: string;
  appSlug: string;
  appName: string;
  capabilityId: string;
  capabilitySlug: string;
  capabilityName: string;
  reason: string;
};

export type AgentRegistrySearchEvaluation = {
  query: string;
  normalizedQuery: string;
  filters: AgentRegistrySearchFilters & {
    categorySlug?: string | null;
  };
  candidateCount: number;
  matchedCapabilityCount: number;
  resultCount: number;
  topMatch:
    | {
        appId: string;
        appSlug: string;
        capabilityId: string;
        capabilitySlug: string;
        categorySlug: string;
        capabilityType: string;
        authType: AgentAuthType;
        interfaceType: AgentInterfaceType;
        interactionMode: AgentInteractionMode;
        readinessBucket: AgentRegistryReadinessBucket;
        similarity: number;
        score: number;
        qualityScore: number;
        matchReason: string;
      }
    | null;
  excludedCandidates: AgentRegistryExcludedCandidate[];
  blockingIssueCount: number;
};

export type AgentIntentTestCase = {
  id: string;
  intent: string;
  suiteType?: "seeded" | "red_team";
  categorySlug?: string | null;
  expectedAppSlugs?: string[];
  expectedCapabilityTypes?: string[];
  expectedCapabilitySlugs?: string[];
  expectedEmptyResult?: boolean;
  expectedExclusionReason?: string;
  expectedBlockedUnsafeMode?: boolean;
  filters?: AgentRegistrySearchFilters;
};

export type AgentIntentTestResult = AgentIntentTestCase & {
  testSetVersion: string;
  passed: boolean;
  topAppId: string | null;
  topAppSlug: string | null;
  topCategorySlug: string | null;
  topCapabilityId: string | null;
  topCapabilitySlug: string | null;
  topCapabilityType: string | null;
  topScore: number | null;
  topQualityScore: number | null;
  topMatchReason: string | null;
  expectedEmptyResult?: boolean;
  expectedExclusionReason?: string;
  expectedBlockedUnsafeMode?: boolean;
  reason: string;
  failureReason: string | null;
};

export type AgentIntentTestRegressionSummary = {
  latestVersion: string | null;
  previousVersion: string | null;
  latestRunCount: number;
  previousRunCount: number;
  newlyFailing: AgentIntentTestResult[];
  newlyPassing: AgentIntentTestResult[];
  unchangedFailures: AgentIntentTestResult[];
};

export type AgentRegistryHealthExport = {
  totalRegistryApps: number;
  publishedRegistryApps: number;
  draftRegistryApps: number;
  pausedRegistryApps: number;
  activeCapabilities: number;
  averageQualityScore: number;
  gradeDistribution: AgentCapabilityQualityDistribution["gradeCounts"];
  readinessBucketDistribution: AgentCapabilityQualityDistribution["readinessBucketCounts"];
  blockedPublicationReasons: Array<{
    issue: string;
    count: number;
  }>;
  capabilityTypeCoverage: Record<string, number>;
  authCoverage: Record<AgentAuthType, number>;
  interfaceCoverage: Record<AgentInterfaceType, number>;
  interactionCoverage: Record<AgentInteractionMode, number>;
};

export type AgentRegistryPublicReadinessMetadata = {
  registryVersion: string;
  schemaVersion: string;
  publishedAppCount: number;
  activeCapabilityCount: number;
  supportedCapabilityTypes: string[];
  supportedAuthTypes: AgentAuthType[];
  supportedInterfaceTypes: AgentInterfaceType[];
  supportedInteractionModes: AgentInteractionMode[];
  docsUrl: string;
  policyUrl: string;
};

export type CatalogCoverageAudit = {
  generatedAt: Date;
  humanCategories: Array<{
    category: Pick<CategoryDefinition, "slug" | "name">;
    totalPublishedApps: number;
    totalDraftApps: number;
    appsWithScreenshots: number;
    appsWithReviews: number;
    appsWithUpdates: number;
    appsWithVerifiedBadge: number;
    appsWithCommunityPickStatus: number;
    appsWithSignalSnapshots: number;
    warnings: string[];
  }>;
  agentCategories: Array<{
    category: Pick<CategoryDefinition, "slug" | "name">;
    totalRegistryApps: number;
    publishedRegistryListings: number;
    draftRegistryListings: number;
    pausedRegistryListings: number;
    activeCapabilities: number;
    deprecatedCapabilities: number;
    averageCapabilityQuality: number;
    schemaCoverage: number;
    docsCoverage: number;
    safetyNotesCoverage: number;
    readOnlyCoverage: number;
    warnings: string[];
  }>;
  capabilityTypes: Array<{
    capabilityType: string;
    agentReadyListingCount: number;
    activeCapabilities: number;
    deprecatedCapabilities: number;
    averageCapabilityQuality: number;
    schemaCoverage: number;
    docsCoverage: number;
    safetyNotesCoverage: number;
    readOnlyCoverage: number;
    warnings: string[];
  }>;
  warnings: string[];
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
