import { AgentCapabilityStatus, AgentListingStatus, AppAudience, AppStatus } from "@prisma/client";
import { cotanaRegistryContract } from "@cotana/config";
import type {
  AgentCapabilityQualityDistribution,
  AgentIntentTestRegressionSummary,
  AgentIntentTestCase,
  AgentIntentTestResult,
  AgentManifestQualityWarning,
  AgentAuthType,
  AgentCapabilityManifest,
  AgentCapabilityQualitySignals,
  AgentCapabilitySummary,
  AgentInteractionMode,
  AgentInterfaceType,
  AgentRegistryPublicReadinessMetadata,
  AgentRegistryCapabilityTaxonomyRow,
  AgentRegistryCompatibilityReport,
  AgentRegistryHealthExport,
  AgentRegistrySearchEvaluation,
  AgentRegistryManifest,
  AgentRegistryQualitySummary,
  AgentRegistryReadinessBucket,
  AgentRegistrySearchFilters,
  CatalogCoverageAudit
} from "@cotana/types";
import { Prisma } from "@prisma/client";
import { prisma } from "../client";

const AGENT_REGISTRY_VERSION = cotanaRegistryContract.registryVersion;
const MIN_AGENT_SUMMARY_LENGTH = 20;
const AGENT_AUTH_TYPES: AgentAuthType[] = ["NONE", "API_KEY", "OAUTH2", "MCP", "CUSTOM"];
const AGENT_INTERFACE_TYPES: AgentInterfaceType[] = [
  "HTTP_API",
  "MCP_SERVER",
  "SDK",
  "WEBHOOK",
  "DATA_FEED",
  "DOCS_ONLY"
];
const AGENT_INTERACTION_MODES: AgentInteractionMode[] = [
  "READ_ONLY",
  "WRITE_ACTION",
  "TRANSACTIONAL",
  "HUMAN_HANDOFF"
];
const READINESS_STATUS_KEYS = [
  "ready",
  "needs_metadata",
  "unsafe_interaction_mode",
  "missing_schema",
  "missing_safety_notes",
  "weak_docs",
  "low_reliability"
] as const satisfies readonly AgentRegistryReadinessBucket[];
const QUALITY_GRADE_KEYS: AgentCapabilityQualitySignals["qualityGrade"][] = [
  "excellent",
  "good",
  "needs_metadata",
  "unsafe"
];
const AGENT_LISTING_STATUS_KEYS = ["NOT_APPLICABLE", "DRAFT", "PUBLISHED", "PAUSED"] as const;

function emptyReadinessStatusCounts() {
  return Object.fromEntries(READINESS_STATUS_KEYS.map((key) => [key, 0])) as AgentRegistryQualitySummary["statusCounts"];
}

export function getAgentCapabilityReadinessBucket(
  capability: Pick<
    AgentCapabilitySummary,
    | "endpointUrl"
    | "docsUrl"
    | "inputSchemaJson"
    | "outputSchemaJson"
    | "safetyNotes"
    | "reliabilityScore"
    | "interactionMode"
  >,
): AgentRegistryReadinessBucket {
  if (capability.interactionMode !== "READ_ONLY") {
    return "unsafe_interaction_mode";
  }

  if (!capability.inputSchemaJson || !capability.outputSchemaJson) {
    return "missing_schema";
  }

  if (!capability.safetyNotes?.trim()) {
    return "missing_safety_notes";
  }

  if (!capability.endpointUrl && !capability.docsUrl) {
    return "weak_docs";
  }

  if (typeof capability.reliabilityScore === "number" && capability.reliabilityScore < 0.7) {
    return "low_reliability";
  }

  return "ready";
}

function toRegistryApp(app: Awaited<ReturnType<typeof prisma.app.findMany>>[number] & {
  category: {
    slug: string;
    name: string;
  };
  agentCapabilities: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
    capabilityType: string;
    authType: string;
    interfaceType: string;
    interactionMode: string;
    endpointUrl: string | null;
    docsUrl: string | null;
    inputSchemaJson: unknown | null;
    outputSchemaJson: unknown | null;
    safetyNotes: string | null;
    status: string;
    reliabilityScore: number | null;
    latencyP50Ms: number | null;
    manifestVersion: number;
    updatedAt: Date;
    lastReviewedAt: Date | null;
    deprecatedAt: Date | null;
    deprecationReason: string | null;
    replacementCapabilityId: string | null;
    replacementDocsUrl: string | null;
  }>;
}) {
  return {
    id: app.id,
    slug: app.slug,
    name: app.name,
    description: app.shortDescription,
    longDescription: app.longDescription,
    websiteUrl: app.websiteUrl,
    logoUrl: app.logoUrl,
    verified: app.verified,
    communityPick: app.communityPick,
    agentAudience: app.agentAudience as "AGENT" | "HYBRID",
    agentListingStatus: app.agentListingStatus as "PUBLISHED",
    agentSummary: app.agentSummary ?? "",
    agentDocsUrl: app.agentDocsUrl,
    manifestVersion: app.agentManifestVersion,
    updatedAt: app.updatedAt,
    lastReviewedAt: app.agentLastReviewedAt,
    category: app.category,
    capabilities: app.agentCapabilities.map((capability) => ({
      id: capability.id,
      name: capability.name,
      slug: capability.slug,
      description: capability.description,
      capabilityType: capability.capabilityType,
      authType: capability.authType as AgentCapabilitySummary["authType"],
      interfaceType: capability.interfaceType as AgentCapabilitySummary["interfaceType"],
      interactionMode: capability.interactionMode as AgentCapabilitySummary["interactionMode"],
      endpointUrl: capability.endpointUrl,
      docsUrl: capability.docsUrl,
      inputSchemaJson: capability.inputSchemaJson,
      outputSchemaJson: capability.outputSchemaJson,
      safetyNotes: capability.safetyNotes,
      status: capability.status as AgentCapabilitySummary["status"],
      reliabilityScore: capability.reliabilityScore,
      latencyP50Ms: capability.latencyP50Ms,
      manifestVersion: capability.manifestVersion,
      updatedAt: capability.updatedAt,
      lastReviewedAt: capability.lastReviewedAt,
      deprecatedAt: capability.deprecatedAt,
      deprecationReason: capability.deprecationReason,
      replacementCapabilityId: capability.replacementCapabilityId,
      replacementDocsUrl: capability.replacementDocsUrl
    }))
  };
}

function agentRegistryWhere(categorySlug?: string | null) {
  return {
    status: AppStatus.PUBLISHED,
    agentAudience: {
      in: [AppAudience.AGENT, AppAudience.HYBRID]
    },
    agentListingStatus: AgentListingStatus.PUBLISHED,
    agentSummary: {
      not: null
    },
    agentCapabilities: {
      some: {
        status: AgentCapabilityStatus.ACTIVE
      }
    },
    ...(categorySlug && categorySlug !== "all"
      ? {
          category: {
            slug: categorySlug
          }
        }
      : {})
  };
}

function toManifest(app: ReturnType<typeof toRegistryApp>): AgentRegistryManifest {
  return {
    version: AGENT_REGISTRY_VERSION,
    purpose: "discovery",
    app,
    qualityWarnings: getAppManifestQualityWarnings(app),
    trustBoundary: {
      cotanaRole: "DISCOVERY_ONLY",
      execution: "EXTERNAL_APP",
      credentialHandling: "NOT_HANDLED_BY_COTANA"
    }
  };
}

function getCapabilityManifestQualityWarnings(capability: AgentCapabilitySummary): AgentManifestQualityWarning[] {
  const warnings = new Set<AgentManifestQualityWarning>();

  if (capability.status === "DEPRECATED") {
    warnings.add("deprecated");
  }

  if (!capability.docsUrl && !capability.endpointUrl) {
    warnings.add("docs_missing");
  }

  if (!capability.inputSchemaJson || !capability.outputSchemaJson) {
    warnings.add("schema_partial");
  }

  if (typeof capability.reliabilityScore !== "number") {
    warnings.add("reliability_unknown");
  }

  if (capability.interactionMode === "HUMAN_HANDOFF") {
    warnings.add("human_handoff_required");
  }

  if (capability.interactionMode === "READ_ONLY") {
    warnings.add("read_only_only");
  }

  return [...warnings];
}

function getAppManifestQualityWarnings(app: ReturnType<typeof toRegistryApp>): AgentManifestQualityWarning[] {
  const warnings = new Set<AgentManifestQualityWarning>();

  if (!app.agentDocsUrl && app.capabilities.every((capability) => !capability.docsUrl)) {
    warnings.add("docs_missing");
  }

  for (const capability of app.capabilities) {
    for (const warning of getCapabilityManifestQualityWarnings(capability)) {
      warnings.add(warning);
    }
  }

  return [...warnings];
}

export function getAgentCapabilityQualitySignals(
  capability: Pick<
    AgentCapabilitySummary,
    | "authType"
    | "endpointUrl"
    | "docsUrl"
    | "inputSchemaJson"
    | "outputSchemaJson"
    | "safetyNotes"
    | "reliabilityScore"
    | "latencyP50Ms"
    | "interactionMode"
  >,
): AgentCapabilityQualitySignals {
  const authFriction =
    capability.authType === "NONE"
      ? "none"
      : capability.authType === "API_KEY"
        ? "low"
        : capability.authType === "OAUTH2" || capability.authType === "MCP"
          ? "medium"
          : "high";
  const latencyTier =
    typeof capability.latencyP50Ms !== "number"
      ? "unknown"
      : capability.latencyP50Ms <= 500
        ? "fast"
        : capability.latencyP50Ms <= 2000
          ? "standard"
          : "slow";
  const reliabilityTier =
    typeof capability.reliabilityScore !== "number"
      ? "unknown"
      : capability.reliabilityScore >= 0.9
        ? "high"
        : capability.reliabilityScore >= 0.7
          ? "medium"
          : "low";
  const interactionSafety =
    capability.interactionMode === "READ_ONLY"
      ? "read_only"
      : capability.interactionMode === "HUMAN_HANDOFF"
        ? "human_handoff"
        : capability.interactionMode === "WRITE_ACTION"
          ? "write_capable"
          : "transactional";
  const qualityScore = getAgentCapabilityQualityScore({
    ...capability,
    authFriction,
    latencyTier,
    reliabilityTier,
    interactionSafety
  });
  const qualityGrade =
    interactionSafety === "transactional" || interactionSafety === "write_capable"
      ? "unsafe"
      : qualityScore >= 85
        ? "excellent"
        : qualityScore >= 70
          ? "good"
          : "needs_metadata";

  return {
    schemaComplete: Boolean(capability.inputSchemaJson && capability.outputSchemaJson),
    safetyNotesPresent: Boolean(capability.safetyNotes?.trim()),
    docsAvailable: Boolean(capability.docsUrl),
    endpointAvailable: Boolean(capability.endpointUrl),
    authFriction,
    latencyTier,
    reliabilityTier,
    interactionSafety,
    qualityScore,
    qualityGrade
  };
}

function getAgentCapabilityQualityScore(
  capability: Pick<
    AgentCapabilitySummary,
    | "endpointUrl"
    | "docsUrl"
    | "inputSchemaJson"
    | "outputSchemaJson"
    | "safetyNotes"
    | "interactionMode"
  > & {
    authFriction: AgentCapabilityQualitySignals["authFriction"];
    latencyTier: AgentCapabilityQualitySignals["latencyTier"];
    reliabilityTier: AgentCapabilityQualitySignals["reliabilityTier"];
    interactionSafety: AgentCapabilityQualitySignals["interactionSafety"];
  },
) {
  const schemaScore = capability.inputSchemaJson && capability.outputSchemaJson ? 24 : 0;
  const docsScore = capability.docsUrl ? 16 : capability.endpointUrl ? 8 : 0;
  const endpointScore = capability.endpointUrl ? 10 : 0;
  const safetyScore = capability.safetyNotes?.trim() ? 16 : 0;
  const authScore = capability.authFriction === "none" ? 10 : capability.authFriction === "low" ? 8 : capability.authFriction === "medium" ? 5 : 2;
  const latencyScore =
    capability.latencyTier === "fast"
      ? 8
      : capability.latencyTier === "standard"
        ? 6
        : capability.latencyTier === "slow"
          ? 3
          : 4;
  const reliabilityScore =
    capability.reliabilityTier === "high"
      ? 10
      : capability.reliabilityTier === "medium"
        ? 7
        : capability.reliabilityTier === "low"
          ? 3
          : 4;
  const interactionScore =
    capability.interactionSafety === "read_only"
      ? 6
      : capability.interactionSafety === "human_handoff"
        ? 3
        : -10;

  return Math.max(
    0,
    Math.min(100, schemaScore + docsScore + endpointScore + safetyScore + authScore + latencyScore + reliabilityScore + interactionScore),
  );
}

export async function listAgentRegistryApps(categorySlug?: string | null) {
  const apps = await prisma.app.findMany({
    where: agentRegistryWhere(categorySlug),
    include: {
      category: {
        select: {
          slug: true,
          name: true
        }
      },
      agentCapabilities: {
        where: {
          status: AgentCapabilityStatus.ACTIVE
        },
        orderBy: {
          name: "asc"
        }
      }
    },
    orderBy: [
      {
        verified: "desc"
      },
      {
        publishedAt: "desc"
      }
    ]
  });

  return apps.map(toRegistryApp);
}

export async function listAgentRegistryCategories() {
  const apps = await listAgentRegistryApps();
  const rows = new Map<
    string,
    {
      slug: string;
      name: string;
      appCount: number;
      capabilityCount: number;
    }
  >();

  for (const app of apps) {
    const current = rows.get(app.category.slug) ?? {
      slug: app.category.slug,
      name: app.category.name,
      appCount: 0,
      capabilityCount: 0
    };

    current.appCount += 1;
    current.capabilityCount += app.capabilities.length;
    rows.set(app.category.slug, current);
  }

  return [...rows.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export async function getAgentRegistryStats() {
  const apps = await listAgentRegistryApps();
  const capabilities = apps.flatMap((app) => app.capabilities);
  const authTypes = new Map<string, number>();
  const interfaceTypes = new Map<string, number>();
  const interactionModes = new Map<string, number>();

  for (const capability of capabilities) {
    authTypes.set(capability.authType, (authTypes.get(capability.authType) ?? 0) + 1);
    interfaceTypes.set(capability.interfaceType, (interfaceTypes.get(capability.interfaceType) ?? 0) + 1);
    interactionModes.set(capability.interactionMode, (interactionModes.get(capability.interactionMode) ?? 0) + 1);
  }

  return {
    appCount: apps.length,
    capabilityCount: capabilities.length,
    categoryCount: new Set(apps.map((app) => app.category.slug)).size,
    authTypes: Object.fromEntries(authTypes),
    interfaceTypes: Object.fromEntries(interfaceTypes),
    interactionModes: Object.fromEntries(interactionModes)
  };
}

export async function getAgentRegistryPublicReadinessMetadata(): Promise<AgentRegistryPublicReadinessMetadata> {
  const [apps, capabilityTypes] = await Promise.all([listAgentRegistryApps(), listAgentRegistryCapabilityTypes()]);
  const capabilities = apps.flatMap((app) => app.capabilities);

  return {
    registryVersion: cotanaRegistryContract.registryVersion,
    schemaVersion: cotanaRegistryContract.schemaVersion,
    publishedAppCount: apps.length,
    activeCapabilityCount: capabilities.length,
    supportedCapabilityTypes: capabilityTypes.map((entry) => entry.capabilityType).sort((left, right) => left.localeCompare(right)),
    supportedAuthTypes: [...AGENT_AUTH_TYPES],
    supportedInterfaceTypes: [...AGENT_INTERFACE_TYPES],
    supportedInteractionModes: [...AGENT_INTERACTION_MODES],
    docsUrl: cotanaRegistryContract.endpoints.docs,
    policyUrl: cotanaRegistryContract.endpoints.policy
  };
}

type CoverageCapability = Pick<
  AgentCapabilitySummary,
  | "capabilityType"
  | "docsUrl"
  | "endpointUrl"
  | "inputSchemaJson"
  | "outputSchemaJson"
  | "safetyNotes"
  | "status"
  | "reliabilityScore"
  | "latencyP50Ms"
  | "interactionMode"
  | "authType"
>;

function percentage(numerator: number, denominator: number) {
  return denominator > 0 ? Number((numerator / denominator).toFixed(3)) : 0;
}

function summarizeCoverageCapabilities(capabilities: CoverageCapability[]) {
  const activeCapabilities = capabilities.filter((capability) => capability.status === AgentCapabilityStatus.ACTIVE);
  const qualityScores = activeCapabilities.map((capability) => getAgentCapabilityQualitySignals(capability).qualityScore);

  return {
    activeCapabilities: activeCapabilities.length,
    deprecatedCapabilities: capabilities.filter((capability) => capability.status === AgentCapabilityStatus.DEPRECATED).length,
    averageCapabilityQuality:
      qualityScores.length > 0 ? Math.round(qualityScores.reduce((total, score) => total + score, 0) / qualityScores.length) : 0,
    schemaCoverage: percentage(
      activeCapabilities.filter((capability) => capability.inputSchemaJson && capability.outputSchemaJson).length,
      activeCapabilities.length,
    ),
    docsCoverage: percentage(
      activeCapabilities.filter((capability) => capability.docsUrl || capability.endpointUrl).length,
      activeCapabilities.length,
    ),
    safetyNotesCoverage: percentage(
      activeCapabilities.filter((capability) => capability.safetyNotes?.trim()).length,
      activeCapabilities.length,
    ),
    readOnlyCoverage: percentage(
      activeCapabilities.filter((capability) => capability.interactionMode === "READ_ONLY").length,
      activeCapabilities.length,
    ),
    reliabilityCoverage: percentage(
      activeCapabilities.filter((capability) => typeof capability.reliabilityScore === "number" && capability.reliabilityScore >= 0.7)
        .length,
      activeCapabilities.length,
    )
  };
}

function coverageWarnings(input: {
  label: string;
  agentReadyListingCount?: number;
  docsCoverage?: number;
  schemaCoverage?: number;
  reliabilityCoverage?: number;
}) {
  return [
    typeof input.agentReadyListingCount === "number" && input.agentReadyListingCount < 2
      ? `${input.label} has fewer than 2 agent-ready listings.`
      : null,
    typeof input.docsCoverage === "number" && input.docsCoverage < 0.8 ? `${input.label} has low docs coverage.` : null,
    typeof input.schemaCoverage === "number" && input.schemaCoverage < 0.8 ? `${input.label} has low schema coverage.` : null,
    typeof input.reliabilityCoverage === "number" && input.reliabilityCoverage < 0.7
      ? `${input.label} has weak reliability coverage.`
      : null
  ].filter((warning): warning is string => Boolean(warning));
}

export function classifyAgentSeedFixture(input: {
  agentListingStatus?: AgentListingStatus | string | null;
  agentCapabilities?: Array<Partial<CoverageCapability>>;
}) {
  const capabilities = input.agentCapabilities ?? [];

  if (input.agentListingStatus === AgentListingStatus.PAUSED) {
    return "paused";
  }

  if (capabilities.some((capability) => capability.status === AgentCapabilityStatus.DEPRECATED)) {
    return "deprecated";
  }

  if (
    capabilities.some(
      (capability) =>
        capability.interactionMode !== "READ_ONLY" ||
        !capability.inputSchemaJson ||
        !capability.outputSchemaJson ||
        !capability.safetyNotes ||
        (typeof capability.reliabilityScore === "number" && capability.reliabilityScore < 0.7),
    )
  ) {
    return "weak";
  }

  const averageReliability =
    capabilities.length > 0
      ? capabilities.reduce((total, capability) => total + (capability.reliabilityScore ?? 0.7), 0) / capabilities.length
      : 0;

  return averageReliability >= 0.9 ? "strong" : "average";
}

export async function getCatalogCoverageAudit(): Promise<CatalogCoverageAudit> {
  const categories = await prisma.category.findMany({
    where: {
      slug: {
        not: "all"
      }
    },
    include: {
      apps: {
        include: {
          screenshots: true,
          reviews: {
            where: {
              status: "PUBLISHED"
            }
          },
          updates: true,
          signalSnapshots: true,
          agentCapabilities: true
        }
      }
    },
    orderBy: {
      sortOrder: "asc"
    }
  });
  const humanCategories: CatalogCoverageAudit["humanCategories"] = [];
  const agentCategories: CatalogCoverageAudit["agentCategories"] = [];
  const capabilityTypeMap = new Map<string, CoverageCapability[]>();

  for (const category of categories) {
    const publicApps = category.apps.filter((app) => app.agentAudience === AppAudience.HUMAN || app.agentAudience === AppAudience.HYBRID);
    const agentApps = category.apps.filter((app) => app.agentAudience === AppAudience.AGENT || app.agentAudience === AppAudience.HYBRID);
    const publishedPublicApps = publicApps.filter((app) => app.status === AppStatus.PUBLISHED);
    const categoryCapabilities = agentApps.flatMap((app) => app.agentCapabilities);
    const capabilitySummary = summarizeCoverageCapabilities(categoryCapabilities);
    const agentReadyListingCount = agentApps.filter(
      (app) =>
        app.status === AppStatus.PUBLISHED &&
        app.agentListingStatus === AgentListingStatus.PUBLISHED &&
        app.agentCapabilities.some((capability) => capability.status === AgentCapabilityStatus.ACTIVE),
    ).length;
    const agentWarnings = coverageWarnings({
      label: category.name,
      agentReadyListingCount,
      docsCoverage: capabilitySummary.docsCoverage,
      schemaCoverage: capabilitySummary.schemaCoverage,
      reliabilityCoverage: capabilitySummary.reliabilityCoverage
    });

    humanCategories.push({
      category: {
        slug: category.slug,
        name: category.name
      },
      totalPublishedApps: publishedPublicApps.length,
      totalDraftApps: publicApps.filter((app) => app.status === AppStatus.DRAFT).length,
      appsWithScreenshots: publishedPublicApps.filter((app) => app.screenshots.length > 0).length,
      appsWithReviews: publishedPublicApps.filter((app) => app.reviews.length > 0).length,
      appsWithUpdates: publishedPublicApps.filter((app) => app.updates.length > 0).length,
      appsWithVerifiedBadge: publishedPublicApps.filter((app) => app.verified).length,
      appsWithCommunityPickStatus: publishedPublicApps.filter((app) => app.communityPick).length,
      appsWithSignalSnapshots: publishedPublicApps.filter((app) => app.signalSnapshots.length > 0).length,
      warnings: publishedPublicApps.length < 3 ? [`${category.name} has fewer than 3 published human apps.`] : []
    });

    agentCategories.push({
      category: {
        slug: category.slug,
        name: category.name
      },
      totalRegistryApps: agentApps.length,
      publishedRegistryListings: agentApps.filter((app) => app.agentListingStatus === AgentListingStatus.PUBLISHED).length,
      draftRegistryListings: agentApps.filter((app) => app.agentListingStatus === AgentListingStatus.DRAFT).length,
      pausedRegistryListings: agentApps.filter((app) => app.agentListingStatus === AgentListingStatus.PAUSED).length,
      ...capabilitySummary,
      warnings: agentWarnings
    });

    for (const capability of categoryCapabilities) {
      const entries = capabilityTypeMap.get(capability.capabilityType) ?? [];
      entries.push(capability);
      capabilityTypeMap.set(capability.capabilityType, entries);
    }
  }

  const capabilityTypes = [...capabilityTypeMap.entries()]
    .map(([capabilityType, capabilities]) => {
      const summary = summarizeCoverageCapabilities(capabilities);
      const agentReadyListingCount = new Set(
        categories.flatMap((category) =>
          category.apps
            .filter(
              (app) =>
                app.status === AppStatus.PUBLISHED &&
                app.agentListingStatus === AgentListingStatus.PUBLISHED &&
                app.agentCapabilities.some(
                  (capability) =>
                    capability.capabilityType === capabilityType && capability.status === AgentCapabilityStatus.ACTIVE,
                ),
            )
            .map((app) => app.id),
        ),
      ).size;

      return {
        capabilityType,
        agentReadyListingCount,
        activeCapabilities: summary.activeCapabilities,
        deprecatedCapabilities: summary.deprecatedCapabilities,
        averageCapabilityQuality: summary.averageCapabilityQuality,
        schemaCoverage: summary.schemaCoverage,
        docsCoverage: summary.docsCoverage,
        safetyNotesCoverage: summary.safetyNotesCoverage,
        readOnlyCoverage: summary.readOnlyCoverage,
        warnings: coverageWarnings({
          label: capabilityType,
          agentReadyListingCount,
          docsCoverage: summary.docsCoverage,
          schemaCoverage: summary.schemaCoverage,
          reliabilityCoverage: summary.reliabilityCoverage
        })
      };
    })
    .sort((left, right) => right.activeCapabilities - left.activeCapabilities || left.capabilityType.localeCompare(right.capabilityType));
  const warnings = [
    ...humanCategories.flatMap((entry) => entry.warnings),
    ...agentCategories.flatMap((entry) => entry.warnings),
    ...capabilityTypes.flatMap((entry) => entry.warnings)
  ];

  return {
    generatedAt: new Date(),
    humanCategories,
    agentCategories,
    capabilityTypes,
    warnings
  };
}

function incrementRecord<T extends string>(record: Record<T, number>, key: T) {
  record[key] = (record[key] ?? 0) + 1;
}

function emptyCountRecord<T extends string>(keys: T[]) {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
}

export async function listAgentRegistryCapabilityTypes(): Promise<AgentRegistryCapabilityTaxonomyRow[]> {
  const apps = await listAgentRegistryApps();
  const rows = new Map<string, AgentRegistryCapabilityTaxonomyRow & { appIds: Set<string> }>();

  for (const app of apps) {
    for (const capability of app.capabilities) {
      const current = rows.get(capability.capabilityType) ?? {
        capabilityType: capability.capabilityType,
        capabilityCount: 0,
        appCount: 0,
        appIds: new Set<string>(),
        categories: [],
        authTypes: emptyCountRecord(AGENT_AUTH_TYPES),
        interfaceTypes: emptyCountRecord(AGENT_INTERFACE_TYPES),
        interactionModes: emptyCountRecord(AGENT_INTERACTION_MODES)
      };
      const category = current.categories.find((entry) => entry.slug === app.category.slug);

      current.capabilityCount += 1;
      current.appIds.add(app.id);
      incrementRecord(current.authTypes, capability.authType);
      incrementRecord(current.interfaceTypes, capability.interfaceType);
      incrementRecord(current.interactionModes, capability.interactionMode);

      if (category) {
        category.capabilityCount += 1;
      } else {
        current.categories.push({
          ...app.category,
          capabilityCount: 1
        });
      }

      rows.set(capability.capabilityType, current);
    }
  }

  return [...rows.values()]
    .map(({ appIds, ...row }) => ({
      ...row,
      appCount: appIds.size,
      categories: row.categories.sort((left, right) => left.name.localeCompare(right.name))
    }))
    .sort((left, right) => right.capabilityCount - left.capabilityCount || left.capabilityType.localeCompare(right.capabilityType));
}

function matchesRegistryFilters(capability: AgentCapabilitySummary, filters: AgentRegistrySearchFilters) {
  if (filters.authTypes?.length && !filters.authTypes.includes(capability.authType)) {
    return false;
  }

  if (filters.interfaceTypes?.length && !filters.interfaceTypes.includes(capability.interfaceType)) {
    return false;
  }

  if (filters.interactionModes?.length && !filters.interactionModes.includes(capability.interactionMode)) {
    return false;
  }

  return true;
}

export async function getAgentRegistryCompatibilityReport(
  filters: AgentRegistrySearchFilters & { categorySlug?: string | null },
): Promise<AgentRegistryCompatibilityReport> {
  const apps = await listAgentRegistryApps(filters.categorySlug);
  const capabilities = apps.flatMap((app) => app.capabilities.map((capability) => ({ appId: app.id, capability })));
  const compatibleCapabilities = capabilities.filter(({ capability }) => matchesRegistryFilters(capability, filters));
  const qualitySignals = compatibleCapabilities.map(({ capability }) => getAgentCapabilityQualitySignals(capability));
  const compatibleAppCount = new Set(compatibleCapabilities.map((entry) => entry.appId)).size;
  const coverageRatio =
    capabilities.length > 0 ? Number((compatibleCapabilities.length / capabilities.length).toFixed(4)) : 0;
  const schemaCoverage =
    qualitySignals.length > 0 ? qualitySignals.filter((signals) => signals.schemaComplete).length / qualitySignals.length : 0;
  const docsCoverage =
    qualitySignals.length > 0
      ? qualitySignals.filter((signals) => signals.docsAvailable || signals.endpointAvailable).length / qualitySignals.length
      : 0;
  const safetyCoverage =
    qualitySignals.length > 0 ? qualitySignals.filter((signals) => signals.safetyNotesPresent).length / qualitySignals.length : 0;
  const readOnlyCoverage =
    compatibleCapabilities.length > 0
      ? compatibleCapabilities.filter(({ capability }) => capability.interactionMode === "READ_ONLY").length / compatibleCapabilities.length
      : 0;
  const reliabilityCoverage =
    qualitySignals.length > 0
      ? qualitySignals.filter((signals) => signals.reliabilityTier === "high" || signals.reliabilityTier === "medium").length /
        qualitySignals.length
      : 0;
  const averageQuality =
    qualitySignals.length > 0
      ? qualitySignals.reduce((total, signals) => total + signals.qualityScore, 0) / qualitySignals.length / 100
      : 0;
  const confidenceScore = Math.round(
    100 *
      (coverageRatio * 0.22 +
        averageQuality * 0.22 +
        schemaCoverage * 0.16 +
        docsCoverage * 0.12 +
        safetyCoverage * 0.12 +
        readOnlyCoverage * 0.1 +
        reliabilityCoverage * 0.06),
  );
  const blockingGaps = [
    compatibleCapabilities.length === 0 ? "No compatible capabilities matched these filters." : null,
    schemaCoverage < 0.8 ? "Schema coverage is below 80%." : null,
    docsCoverage < 0.8 ? "Docs or endpoint coverage is below 80%." : null,
    safetyCoverage < 0.8 ? "Safety-note coverage is below 80%." : null,
    readOnlyCoverage < 1 ? "Some matching capabilities are not read-only." : null,
    reliabilityCoverage < 0.6 ? "Reliability metadata is weak or missing." : null
  ].filter((entry): entry is string => Boolean(entry));
  const recommendedFilterChanges = [
    filters.interactionModes?.includes("READ_ONLY") ? null : "Add interaction=READ_ONLY for discovery-safe results.",
    filters.interfaceTypes?.length ? null : "Add interface filters when your workflow requires a specific integration surface.",
    filters.authTypes?.length ? null : "Add auth filters when your workflow can only use no-auth or API-key capabilities."
  ].filter((entry): entry is string => Boolean(entry));

  return {
    filters,
    totals: {
      appCount: apps.length,
      capabilityCount: capabilities.length
    },
    compatible: {
      appCount: compatibleAppCount,
      capabilityCount: compatibleCapabilities.length
    },
    coverageRatio,
    compatibilityConfidence: {
      score: confidenceScore,
      grade: confidenceScore >= 75 ? "high" : confidenceScore >= 45 ? "medium" : "low",
      reasons: [
        `${compatibleCapabilities.length} matching capabilities across ${compatibleAppCount} apps.`,
        `${Math.round(schemaCoverage * 100)}% schema coverage.`,
        `${Math.round(docsCoverage * 100)}% docs or endpoint coverage.`,
        `${Math.round(safetyCoverage * 100)}% safety-note coverage.`,
        `${Math.round(readOnlyCoverage * 100)}% read-only coverage.`
      ],
      blockingGaps,
      recommendedFilterChanges
    },
    guidance:
      compatibleCapabilities.length > 0
        ? "Cotana found compatible discovery targets. The outside agent must inspect the target app docs before execution."
        : "No compatible discovery target is currently available for these constraints."
  };
}

export async function getAgentRegistryManifest(slug: string) {
  const app = await prisma.app.findFirst({
    where: {
      ...agentRegistryWhere(),
      slug
    },
    include: {
      category: {
        select: {
          slug: true,
          name: true
        }
      },
      agentCapabilities: {
        where: {
          status: {
            in: [AgentCapabilityStatus.ACTIVE, AgentCapabilityStatus.DEPRECATED]
          }
        },
        orderBy: {
          name: "asc"
        }
      }
    }
  });

  return app ? toManifest(toRegistryApp(app)) : null;
}

export async function getAgentRegistryCapabilityManifest(
  appSlug: string,
  capabilitySlug: string,
): Promise<AgentCapabilityManifest | null> {
  const app = await prisma.app.findFirst({
    where: {
      status: AppStatus.PUBLISHED,
      agentAudience: {
        in: [AppAudience.AGENT, AppAudience.HYBRID]
      },
      agentListingStatus: AgentListingStatus.PUBLISHED,
      agentSummary: {
        not: null
      },
      slug: appSlug,
      agentCapabilities: {
        some: {
          slug: capabilitySlug,
          status: {
            in: [AgentCapabilityStatus.ACTIVE, AgentCapabilityStatus.DEPRECATED]
          }
        }
      }
    },
    include: {
      category: {
        select: {
          slug: true,
          name: true
        }
      },
      agentCapabilities: {
        where: {
          slug: capabilitySlug,
          status: {
            in: [AgentCapabilityStatus.ACTIVE, AgentCapabilityStatus.DEPRECATED]
          }
        },
        orderBy: {
          name: "asc"
        }
      }
    }
  });
  const manifest = app ? toManifest(toRegistryApp(app)) : null;
  const capability = manifest?.app.capabilities.find((entry) => entry.slug === capabilitySlug);

  if (!manifest || !capability) {
    return null;
  }

  return {
    version: AGENT_REGISTRY_VERSION,
    purpose: "discovery",
    app: {
      id: manifest.app.id,
      slug: manifest.app.slug,
      name: manifest.app.name,
      description: manifest.app.description,
      longDescription: manifest.app.longDescription,
      websiteUrl: manifest.app.websiteUrl,
      logoUrl: manifest.app.logoUrl,
      verified: manifest.app.verified,
      communityPick: manifest.app.communityPick,
      agentAudience: manifest.app.agentAudience,
      agentListingStatus: manifest.app.agentListingStatus,
      agentSummary: manifest.app.agentSummary,
      agentDocsUrl: manifest.app.agentDocsUrl,
      manifestVersion: manifest.app.manifestVersion,
      updatedAt: manifest.app.updatedAt,
      lastReviewedAt: manifest.app.lastReviewedAt,
      category: manifest.app.category
    },
    capability,
    qualitySignals: getAgentCapabilityQualitySignals(capability),
    qualityWarnings: getCapabilityManifestQualityWarnings(capability),
    usageBoundary: {
      cotanaCanExecute: false,
      credentialHandling: "EXTERNAL_APP",
      requiredNextStep: "READ_TARGET_APP_DOCS"
    },
    trustBoundary: manifest.trustBoundary
  };
}

export async function listAgentRegistryQualityRows() {
  const apps = await prisma.app.findMany({
    where: {
      agentAudience: {
        in: [AppAudience.AGENT, AppAudience.HYBRID]
      }
    },
    include: {
      category: {
        select: {
          slug: true,
          name: true
        }
      },
      agentCapabilities: {
        orderBy: {
          name: "asc"
        }
      }
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  return apps.map((app) => {
    const activeCapabilities = app.agentCapabilities.filter(
      (capability) => capability.status === AgentCapabilityStatus.ACTIVE,
    );
    const issues: string[] = [];
    const issueCodes = new Set<keyof AgentRegistryQualitySummary["statusCounts"]>();

    if (app.status !== AppStatus.PUBLISHED) {
      issues.push("App is not published for the public store.");
      issueCodes.add("needs_metadata");
    }

    if (app.agentListingStatus !== AgentListingStatus.PUBLISHED) {
      issues.push("Agent registry listing is not published.");
      issueCodes.add("needs_metadata");
    }

    if (!app.agentSummary?.trim() || app.agentSummary.trim().length < MIN_AGENT_SUMMARY_LENGTH) {
      issues.push("Agent summary is missing or too short.");
      issueCodes.add("needs_metadata");
    }

    if (activeCapabilities.length === 0) {
      issues.push("No active agent capabilities.");
      issueCodes.add("needs_metadata");
    }

    for (const capability of activeCapabilities) {
      if (!capability.endpointUrl && !capability.docsUrl) {
        issues.push(`${capability.name} needs an endpoint URL or docs URL.`);
        issueCodes.add("weak_docs");
      }

      if (!capability.inputSchemaJson || !capability.outputSchemaJson) {
        issues.push(`${capability.name} needs input and output schemas.`);
        issueCodes.add("missing_schema");
      }

      if (!capability.safetyNotes?.trim()) {
        issues.push(`${capability.name} needs safety notes.`);
        issueCodes.add("missing_safety_notes");
      }

      if (capability.interactionMode !== "READ_ONLY") {
        issues.push(`${capability.name} is not read-only.`);
        issueCodes.add("unsafe_interaction_mode");
      }

      if (typeof capability.reliabilityScore === "number" && capability.reliabilityScore < 0.7) {
        issues.push(`${capability.name} has low reliability metadata.`);
        issueCodes.add("low_reliability");
      }
    }
    const dedupedIssues = [...new Set(issues)];
    const readinessScore = Math.max(0, Math.round(100 - dedupedIssues.length * 18));
    const status =
      dedupedIssues.length === 0
        ? "ready"
        : issueCodes.has("unsafe_interaction_mode")
          ? "unsafe_interaction_mode"
          : issueCodes.has("missing_schema")
            ? "missing_schema"
            : issueCodes.has("missing_safety_notes")
              ? "missing_safety_notes"
              : issueCodes.has("weak_docs")
                ? "weak_docs"
                : issueCodes.has("low_reliability")
                  ? "low_reliability"
                  : "needs_metadata";

    return {
      appId: app.id,
      slug: app.slug,
      name: app.name,
      category: app.category,
      appStatus: app.status,
      agentAudience: app.agentAudience,
      agentListingStatus: app.agentListingStatus,
      manifestVersion: app.agentManifestVersion,
      lastReviewedAt: app.agentLastReviewedAt,
      activeCapabilityCount: activeCapabilities.length,
      totalCapabilityCount: app.agentCapabilities.length,
      deprecatedCapabilityCount: app.agentCapabilities.filter(
        (capability) => capability.status === AgentCapabilityStatus.DEPRECATED,
      ).length,
      pausedCapabilityCount: app.agentCapabilities.filter((capability) => capability.status === AgentCapabilityStatus.PAUSED).length,
      readinessScore,
      blockingIssueCount: dedupedIssues.length,
      readinessStatus: status,
      issueCodes: status === "ready" ? ["ready"] : [...issueCodes],
      ready: issues.length === 0,
      issues: dedupedIssues
    };
  });
}

export async function listAgentRegistryChangeLogs(limit = 30) {
  return prisma.agentRegistryChangeLog.findMany({
    include: {
      app: {
        select: {
          id: true,
          slug: true,
          name: true
        }
      },
      capability: {
        select: {
          id: true,
          slug: true,
          name: true,
          status: true,
          manifestVersion: true,
          lastReviewedAt: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: limit
  });
}

export async function getAgentRegistryQualitySummary(): Promise<AgentRegistryQualitySummary> {
  const rows = await listAgentRegistryQualityRows();
  const issueCounts = new Map<string, number>();

  for (const row of rows) {
    for (const issue of row.issues) {
      issueCounts.set(issue, (issueCounts.get(issue) ?? 0) + 1);
    }
  }

  return {
    totalListings: rows.length,
    readyListings: rows.filter((row) => row.ready).length,
    needsWorkListings: rows.filter((row) => !row.ready).length,
    averageReadinessScore:
      rows.length > 0
        ? Math.round(rows.reduce((total, row) => total + row.readinessScore, 0) / rows.length)
        : 0,
    blockingIssueCount: rows.reduce((total, row) => total + row.blockingIssueCount, 0),
    statusCounts: rows.reduce((counts, row) => {
      counts[row.readinessStatus as keyof AgentRegistryQualitySummary["statusCounts"]] += 1;
      return counts;
    }, emptyReadinessStatusCounts()),
    topIssues: [...issueCounts.entries()]
      .map(([issue, count]) => ({ issue, count }))
      .sort((left, right) => right.count - left.count || left.issue.localeCompare(right.issue))
      .slice(0, 5)
  };
}

export async function getAgentCapabilityQualityDistribution(): Promise<AgentCapabilityQualityDistribution> {
  const apps = await prisma.app.findMany({
    where: {
      agentAudience: {
        in: [AppAudience.AGENT, AppAudience.HYBRID]
      }
    },
    include: {
      category: {
        select: {
          slug: true,
          name: true
        }
      },
      agentCapabilities: {
        orderBy: {
          name: "asc"
        }
      }
    }
  });
  const gradeCounts = emptyCountRecord(QUALITY_GRADE_KEYS);
  const readinessBucketCounts = emptyReadinessStatusCounts();
  const capabilityTypeCounts: Record<string, number> = {};
  const authTypeCounts = emptyCountRecord(AGENT_AUTH_TYPES);
  const interfaceTypeCounts = emptyCountRecord(AGENT_INTERFACE_TYPES);
  const interactionModeCounts = emptyCountRecord(AGENT_INTERACTION_MODES);
  const listingStatusCounts = emptyCountRecord([...AGENT_LISTING_STATUS_KEYS]);
  const nonReadOnlyCapabilities: AgentCapabilityQualityDistribution["nonReadOnlyCapabilities"] = [];
  const matrixCounts = new Map<string, AgentCapabilityQualityDistribution["matrix"][number]>();
  let totalCapabilities = 0;
  let pausedCapabilityCount = 0;
  let deprecatedCapabilityCount = 0;

  for (const app of apps) {
    incrementRecord(listingStatusCounts, app.agentListingStatus);
    pausedCapabilityCount += app.agentCapabilities.filter((entry) => entry.status === AgentCapabilityStatus.PAUSED).length;
    deprecatedCapabilityCount += app.agentCapabilities.filter((entry) => entry.status === AgentCapabilityStatus.DEPRECATED).length;

    for (const capability of app.agentCapabilities.filter((entry) => entry.status === AgentCapabilityStatus.ACTIVE)) {
      const qualitySignals = getAgentCapabilityQualitySignals(capability);
      const readinessBucket = getAgentCapabilityReadinessBucket(capability);
      const matrixKey = `${qualitySignals.qualityGrade}:${readinessBucket}`;

      totalCapabilities += 1;
      incrementRecord(gradeCounts, qualitySignals.qualityGrade);
      incrementRecord(readinessBucketCounts, readinessBucket);
      capabilityTypeCounts[capability.capabilityType] = (capabilityTypeCounts[capability.capabilityType] ?? 0) + 1;
      incrementRecord(authTypeCounts, capability.authType);
      incrementRecord(interfaceTypeCounts, capability.interfaceType);
      incrementRecord(interactionModeCounts, capability.interactionMode);
      if (capability.interactionMode !== "READ_ONLY") {
        nonReadOnlyCapabilities.push({
          appId: app.id,
          appSlug: app.slug,
          appName: app.name,
          capabilityId: capability.id,
          capabilitySlug: capability.slug,
          capabilityName: capability.name,
          interactionMode: capability.interactionMode,
          readinessBucket
        });
      }
      matrixCounts.set(matrixKey, {
        grade: qualitySignals.qualityGrade,
        readinessBucket,
        count: (matrixCounts.get(matrixKey)?.count ?? 0) + 1
      });
    }
  }

  return {
    totalCapabilities,
    pausedCapabilityCount,
    deprecatedCapabilityCount,
    gradeCounts,
    readinessBucketCounts,
    capabilityTypeCounts,
    authTypeCounts,
    interfaceTypeCounts,
    interactionModeCounts,
    listingStatusCounts,
    nonReadOnlyCapabilities: nonReadOnlyCapabilities.sort((left, right) => left.appName.localeCompare(right.appName)),
    matrix: [...matrixCounts.values()].sort(
      (left, right) =>
        QUALITY_GRADE_KEYS.indexOf(left.grade) - QUALITY_GRADE_KEYS.indexOf(right.grade) ||
        READINESS_STATUS_KEYS.indexOf(left.readinessBucket) - READINESS_STATUS_KEYS.indexOf(right.readinessBucket),
    )
  };
}

export async function recordAgentRegistryEvaluationLog(evaluation: AgentRegistrySearchEvaluation) {
  const filtersJson = JSON.parse(JSON.stringify(evaluation.filters)) as Prisma.InputJsonValue;
  const excludedCandidatesJson = JSON.parse(JSON.stringify(evaluation.excludedCandidates)) as Prisma.InputJsonValue;

  await prisma.agentRegistryEvaluationLog.create({
    data: {
      query: evaluation.query,
      normalizedQuery: evaluation.normalizedQuery,
      filtersJson,
      resultCount: evaluation.resultCount,
      candidateCount: evaluation.candidateCount,
      matchedCapabilityCount: evaluation.matchedCapabilityCount,
      topAppId: evaluation.topMatch?.appId ?? null,
      topAppSlug: evaluation.topMatch?.appSlug ?? null,
      topCapabilityId: evaluation.topMatch?.capabilityId ?? null,
      topCapabilitySlug: evaluation.topMatch?.capabilitySlug ?? null,
      topCategorySlug: evaluation.topMatch?.categorySlug ?? null,
      topCapabilityType: evaluation.topMatch?.capabilityType ?? null,
      topAuthType: evaluation.topMatch?.authType ?? null,
      topInterfaceType: evaluation.topMatch?.interfaceType ?? null,
      topInteractionMode: evaluation.topMatch?.interactionMode ?? null,
      topReadinessBucket: evaluation.topMatch?.readinessBucket ?? null,
      topSimilarity: evaluation.topMatch?.similarity ?? null,
      topScore: evaluation.topMatch?.score ?? null,
      topQualityScore: evaluation.topMatch?.qualityScore ?? null,
      topMatchReason: evaluation.topMatch?.matchReason ?? null,
      excludedCandidatesJson,
      blockingIssueCount: evaluation.blockingIssueCount
    }
  });
}

export type AgentRegistryEvaluationLogFilters = {
  limit?: number;
  query?: string | null;
  categorySlug?: string | null;
  capabilityType?: string | null;
  authType?: AgentAuthType | null;
  interfaceType?: AgentInterfaceType | null;
  interactionMode?: AgentInteractionMode | null;
  readinessBucket?: AgentRegistryReadinessBucket | null;
  matchedApp?: string | null;
  minBlockingIssueCount?: number | null;
  maxBlockingIssueCount?: number | null;
  from?: Date | null;
  to?: Date | null;
};

export async function listAgentRegistryEvaluationLogs(options: number | AgentRegistryEvaluationLogFilters = 20) {
  const filters = typeof options === "number" ? { limit: options } : options;

  return prisma.agentRegistryEvaluationLog.findMany({
    where: {
      ...(filters.query
        ? {
            normalizedQuery: {
              contains: filters.query.trim().toLowerCase()
            }
          }
        : {}),
      ...(filters.categorySlug && filters.categorySlug !== "all"
        ? {
            topCategorySlug: filters.categorySlug
          }
        : {}),
      ...(filters.capabilityType
        ? {
            topCapabilityType: filters.capabilityType
          }
        : {}),
      ...(filters.authType
        ? {
            topAuthType: filters.authType
          }
        : {}),
      ...(filters.interfaceType
        ? {
            topInterfaceType: filters.interfaceType
          }
        : {}),
      ...(filters.interactionMode
        ? {
            topInteractionMode: filters.interactionMode
          }
        : {}),
      ...(filters.readinessBucket
        ? {
            topReadinessBucket: filters.readinessBucket
          }
        : {}),
      ...(filters.matchedApp
        ? {
            OR: [
              {
                topAppId: filters.matchedApp
              },
              {
                topAppSlug: {
                  contains: filters.matchedApp.trim().toLowerCase()
                }
              }
            ]
          }
        : {}),
      ...(typeof filters.minBlockingIssueCount === "number" || typeof filters.maxBlockingIssueCount === "number"
        ? {
            blockingIssueCount: {
              ...(typeof filters.minBlockingIssueCount === "number" ? { gte: filters.minBlockingIssueCount } : {}),
              ...(typeof filters.maxBlockingIssueCount === "number" ? { lte: filters.maxBlockingIssueCount } : {})
            }
          }
        : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {})
            }
          }
        : {})
    },
    orderBy: {
      createdAt: "desc"
    },
    take: filters.limit ?? 20
  });
}

export async function getAgentRegistryEvaluationLog(id: string) {
  return prisma.agentRegistryEvaluationLog.findUnique({
    where: {
      id
    }
  });
}

export async function recordAgentRegistryIntentTestRun(result: AgentIntentTestResult) {
  await prisma.agentRegistryIntentTestRun.create({
    data: {
      testSetVersion: result.testSetVersion,
      testCaseId: result.id,
      query: result.intent,
      filtersJson: JSON.parse(
        JSON.stringify({
          ...(result.filters ?? {}),
          categorySlug: result.categorySlug ?? null,
          suiteType: result.suiteType ?? "seeded",
          expectedEmptyResult: result.expectedEmptyResult ?? false,
          expectedExclusionReason: result.expectedExclusionReason ?? null,
          expectedBlockedUnsafeMode: result.expectedBlockedUnsafeMode ?? false
        }),
      ) as Prisma.InputJsonValue,
      expectedCategorySlug: result.categorySlug ?? null,
      expectedAppSlugsJson: result.expectedAppSlugs
        ? (JSON.parse(JSON.stringify(result.expectedAppSlugs)) as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      expectedCapabilityTypesJson: result.expectedCapabilityTypes
        ? (JSON.parse(JSON.stringify(result.expectedCapabilityTypes)) as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      expectedCapabilitySlugsJson: result.expectedCapabilitySlugs
        ? (JSON.parse(JSON.stringify(result.expectedCapabilitySlugs)) as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      topMatchedAppId: result.topAppId,
      topMatchedAppSlug: result.topAppSlug,
      topMatchedCategorySlug: result.topCategorySlug,
      topMatchedCapabilityId: result.topCapabilityId,
      topMatchedCapabilitySlug: result.topCapabilitySlug,
      topMatchedCapabilityType: result.topCapabilityType,
      score: result.topScore,
      qualityScore: result.topQualityScore,
      matchReason: result.topMatchReason,
      passed: result.passed,
      failureReason: result.failureReason
    }
  });
}

export async function listAgentRegistryIntentTestRuns(limit = 20) {
  return prisma.agentRegistryIntentTestRun.findMany({
    orderBy: {
      ranAt: "desc"
    },
    take: limit
  });
}

function jsonArray(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : undefined;
}

function intentRunToResult(run: {
  testSetVersion?: string | null;
  testCaseId: string;
  query: string;
  filtersJson: unknown;
  expectedCategorySlug: string | null;
  expectedAppSlugsJson?: unknown;
  expectedCapabilityTypesJson: unknown;
  expectedCapabilitySlugsJson: unknown;
  topMatchedAppId: string | null;
  topMatchedAppSlug: string | null;
  topMatchedCategorySlug: string | null;
  topMatchedCapabilityId: string | null;
  topMatchedCapabilitySlug: string | null;
  topMatchedCapabilityType: string | null;
  score: number | null;
  qualityScore?: number | null;
  matchReason: string | null;
  passed: boolean;
  failureReason: string | null;
}): AgentIntentTestResult {
  const filters =
    run.filtersJson && typeof run.filtersJson === "object" && !Array.isArray(run.filtersJson)
      ? (run.filtersJson as AgentIntentTestResult["filters"] & { categorySlug?: string | null })
      : {};
  const metadata = filters as AgentRegistrySearchFilters & {
    suiteType?: AgentIntentTestCase["suiteType"];
    expectedEmptyResult?: boolean;
    expectedExclusionReason?: string | null;
    expectedBlockedUnsafeMode?: boolean;
  };

  return {
    id: run.testCaseId,
    testSetVersion: run.testSetVersion ?? "manual",
    intent: run.query,
    suiteType: metadata.suiteType,
    categorySlug: run.expectedCategorySlug,
    expectedAppSlugs: jsonArray(run.expectedAppSlugsJson),
    expectedCapabilityTypes: jsonArray(run.expectedCapabilityTypesJson),
    expectedCapabilitySlugs: jsonArray(run.expectedCapabilitySlugsJson),
    expectedEmptyResult: metadata.expectedEmptyResult,
    expectedExclusionReason: metadata.expectedExclusionReason ?? undefined,
    expectedBlockedUnsafeMode: metadata.expectedBlockedUnsafeMode,
    filters,
    passed: run.passed,
    topAppId: run.topMatchedAppId,
    topAppSlug: run.topMatchedAppSlug,
    topCategorySlug: run.topMatchedCategorySlug,
    topCapabilityId: run.topMatchedCapabilityId,
    topCapabilitySlug: run.topMatchedCapabilitySlug,
    topCapabilityType: run.topMatchedCapabilityType,
    topScore: run.score,
    topQualityScore: run.qualityScore ?? null,
    topMatchReason: run.matchReason,
    reason: run.passed ? "Top capability matched the expected intent profile." : (run.failureReason ?? "Seeded intent failed."),
    failureReason: run.failureReason
  };
}

export async function compareLatestAgentRegistryIntentTestRuns(): Promise<AgentIntentTestRegressionSummary> {
  const recentRuns = await prisma.agentRegistryIntentTestRun.findMany({
    orderBy: {
      ranAt: "desc"
    },
    take: 200
  });
  const versions: string[] = [];

  for (const run of recentRuns) {
    const version = run.testSetVersion ?? "manual";
    if (!versions.includes(version)) {
      versions.push(version);
    }
    if (versions.length >= 2) {
      break;
    }
  }

  const latestVersion = versions[0] ?? null;
  const previousVersion = versions[1] ?? null;
  const latestRuns = latestVersion ? recentRuns.filter((run) => (run.testSetVersion ?? "manual") === latestVersion).map(intentRunToResult) : [];
  const previousRuns = previousVersion ? recentRuns.filter((run) => (run.testSetVersion ?? "manual") === previousVersion).map(intentRunToResult) : [];
  const previousById = new Map(previousRuns.map((run) => [run.id, run]));

  return {
    latestVersion,
    previousVersion,
    latestRunCount: latestRuns.length,
    previousRunCount: previousRuns.length,
    newlyFailing: latestRuns.filter((run) => !run.passed && previousById.get(run.id)?.passed === true),
    newlyPassing: latestRuns.filter((run) => run.passed && previousById.get(run.id)?.passed === false),
    unchangedFailures: latestRuns.filter((run) => !run.passed && previousById.get(run.id)?.passed === false)
  };
}

export async function getAgentRegistryHealthExport(): Promise<AgentRegistryHealthExport> {
  const [rows, summary, distribution] = await Promise.all([
    listAgentRegistryQualityRows(),
    getAgentRegistryQualitySummary(),
    getAgentCapabilityQualityDistribution()
  ]);
  const qualityScoreTotal = distribution.matrix.reduce((total, entry) => {
    const gradeScore =
      entry.grade === "excellent" ? 92 : entry.grade === "good" ? 78 : entry.grade === "needs_metadata" ? 48 : 15;
    return total + gradeScore * entry.count;
  }, 0);

  return {
    totalRegistryApps: rows.length,
    publishedRegistryApps: rows.filter((row) => row.agentListingStatus === "PUBLISHED").length,
    draftRegistryApps: rows.filter((row) => row.agentListingStatus === "DRAFT").length,
    pausedRegistryApps: rows.filter((row) => row.agentListingStatus === "PAUSED").length,
    activeCapabilities: distribution.totalCapabilities,
    averageQualityScore:
      distribution.totalCapabilities > 0 ? Math.round(qualityScoreTotal / distribution.totalCapabilities) : 0,
    gradeDistribution: distribution.gradeCounts,
    readinessBucketDistribution: distribution.readinessBucketCounts,
    blockedPublicationReasons: summary.topIssues,
    capabilityTypeCoverage: distribution.capabilityTypeCounts,
    authCoverage: distribution.authTypeCounts,
    interfaceCoverage: distribution.interfaceTypeCounts,
    interactionCoverage: distribution.interactionModeCounts
  };
}

export async function listCapabilityQualityTrend(limit = 40) {
  const logs = await prisma.agentRegistryEvaluationLog.findMany({
    where: {
      topQualityScore: {
        not: null
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: limit
  });

  return logs.map((log) => ({
    observedAt: log.createdAt,
    query: log.query,
    appSlug: log.topAppSlug,
    capabilitySlug: log.topCapabilitySlug,
    qualityScore: log.topQualityScore,
    readinessBucket: log.topReadinessBucket
  }));
}

export async function listAppTrustSignalTrend(appId?: string, limit = 40) {
  return prisma.appSignalSnapshot.findMany({
    where: {
      ...(appId ? { appId } : {})
    },
    orderBy: {
      observedAt: "desc"
    },
    take: limit
  });
}

export async function listDiscoveryScoreTrend(appId?: string, limit = 40) {
  return prisma.discoveryInsightSnapshot.findMany({
    where: {
      ...(appId ? { appId } : {})
    },
    orderBy: {
      computedAt: "desc"
    },
    take: limit
  });
}

export async function listSignalAvailabilityTrend(limit = 40) {
  return prisma.appSignalSnapshot.groupBy({
    by: ["category", "metric", "observedAt"],
    _count: {
      _all: true
    },
    orderBy: {
      observedAt: "desc"
    },
    take: limit
  });
}

export async function listMissingMetadataTrend() {
  const summary = await getAgentRegistryQualitySummary();

  return {
    observedAt: new Date(),
    missingMetadataCount:
      summary.statusCounts.needs_metadata +
      summary.statusCounts.missing_schema +
      summary.statusCounts.missing_safety_notes +
      summary.statusCounts.weak_docs +
      summary.statusCounts.low_reliability,
    readinessBucketCounts: summary.statusCounts,
    topIssues: summary.topIssues
  };
}

export async function listAgentIntentTestCases(): Promise<AgentIntentTestCase[]> {
  const config = await prisma.configKV.findUnique({
    where: {
      key: "agent.intent_tests"
    }
  });

  if (Array.isArray(config?.valueJson)) {
    return config.valueJson as AgentIntentTestCase[];
  }

  return [
    {
      id: "yield-rates-read-only",
      intent: "find read-only yield rates",
      categorySlug: "lending-yield",
      expectedCapabilityTypes: ["comparison"],
      filters: {
        interactionModes: ["READ_ONLY"]
      }
    },
    {
      id: "prediction-market-odds",
      intent: "compare prediction market odds",
      categorySlug: "prediction-markets",
      expectedCapabilityTypes: ["search"],
      filters: {
        interactionModes: ["READ_ONLY"]
      }
    },
    {
      id: "protocol-tvl",
      intent: "get protocol TVL",
      categorySlug: "defi",
      expectedCapabilityTypes: ["data"],
      filters: {
        interactionModes: ["READ_ONLY"]
      }
    },
    {
      id: "stablecoin-swap-routes",
      intent: "find stablecoin swap routes",
      categorySlug: "defi",
      expectedCapabilityTypes: ["data"],
      filters: {
        interactionModes: ["READ_ONLY"]
      }
    }
  ];
}

export async function listAgentRedTeamTestCases(): Promise<AgentIntentTestCase[]> {
  const config = await prisma.configKV.findUnique({
    where: {
      key: "agent.red_team_tests"
    }
  });

  if (Array.isArray(config?.valueJson)) {
    return config.valueJson as AgentIntentTestCase[];
  }

  return [
    {
      id: "empty-query",
      suiteType: "red_team",
      intent: "",
      expectedEmptyResult: true,
      filters: {
        interactionModes: ["READ_ONLY"]
      }
    },
    {
      id: "execute-yield-transaction",
      suiteType: "red_team",
      intent: "move my funds into the highest yield vault",
      expectedBlockedUnsafeMode: true,
      expectedExclusionReason: "Interaction mode",
      filters: {
        interactionModes: ["READ_ONLY"]
      }
    },
    {
      id: "unsupported-credential-request",
      suiteType: "red_team",
      intent: "use my private key to claim wallet rewards",
      expectedEmptyResult: true,
      filters: {
        authTypes: ["NONE"],
        interactionModes: ["READ_ONLY"]
      }
    },
    {
      id: "normal-read-only-market-discovery",
      suiteType: "red_team",
      intent: "find read-only prediction market discovery tools",
      categorySlug: "prediction-markets",
      expectedCapabilityTypes: ["search"],
      filters: {
        interactionModes: ["READ_ONLY"]
      }
    }
  ];
}

export async function searchAgentRegistryCapabilities(query: string, categorySlug?: string | null) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  const apps = await listAgentRegistryApps(categorySlug);
  const queryTerms = normalizedQuery.split(/[^a-z0-9]+/).filter(Boolean);

  return apps
    .map((app) => {
      const matchedCapabilities = app.capabilities
        .map((capability) => {
          const haystack = [
            app.name,
            app.agentSummary,
            app.category.name,
            capability.name,
            capability.description,
            capability.capabilityType,
            capability.safetyNotes
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          const score = queryTerms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);

          return {
            ...capability,
            matchScore: score
          };
        })
        .filter((capability) => capability.matchScore > 0)
        .sort((left, right) => right.matchScore - left.matchScore);

      return {
        app,
        matchedCapabilities,
        score: matchedCapabilities.reduce((total, capability) => total + capability.matchScore, 0)
      };
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score);
}
