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
  communityPick: boolean;
  agentAudience: AppAudience;
  shortDescription: string;
  longDescription: string;
  publishedAt: Date | null;
  category: CategoryDefinition;
  rating: number;
  reviewCount: number;
  likeCount: number;
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
  category: Pick<CategoryDefinition, "slug" | "name">;
  capabilities: AgentCapabilitySummary[];
};

export type AgentRegistryManifest = {
  version: string;
  purpose: "discovery";
  app: AgentRegistryApp;
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
  gradeCounts: Record<AgentCapabilityQualitySignals["qualityGrade"], number>;
  readinessBucketCounts: Record<AgentRegistryReadinessBucket, number>;
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
  categorySlug?: string | null;
  expectedCapabilityTypes?: string[];
  expectedCapabilitySlugs?: string[];
  filters?: AgentRegistrySearchFilters;
};

export type AgentIntentTestResult = AgentIntentTestCase & {
  passed: boolean;
  topAppId: string | null;
  topAppSlug: string | null;
  topCategorySlug: string | null;
  topCapabilityId: string | null;
  topCapabilitySlug: string | null;
  topCapabilityType: string | null;
  topScore: number | null;
  topMatchReason: string | null;
  reason: string;
  failureReason: string | null;
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
