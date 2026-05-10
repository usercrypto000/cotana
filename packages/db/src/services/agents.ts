import { AgentCapabilityStatus, AgentListingStatus, AppAudience, AppStatus } from "@prisma/client";
import type {
  AgentCapabilityQualityDistribution,
  AgentIntentTestCase,
  AgentIntentTestResult,
  AgentAuthType,
  AgentCapabilityManifest,
  AgentCapabilityQualitySignals,
  AgentCapabilitySummary,
  AgentInteractionMode,
  AgentInterfaceType,
  AgentRegistryCapabilityTaxonomyRow,
  AgentRegistryCompatibilityReport,
  AgentRegistrySearchEvaluation,
  AgentRegistryManifest,
  AgentRegistryQualitySummary,
  AgentRegistryReadinessBucket,
  AgentRegistrySearchFilters
} from "@cotana/types";
import { Prisma } from "@prisma/client";
import { prisma } from "../client";

const AGENT_REGISTRY_VERSION = "2026-05-07";
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
      latencyP50Ms: capability.latencyP50Ms
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
    trustBoundary: {
      cotanaRole: "DISCOVERY_ONLY",
      execution: "EXTERNAL_APP",
      credentialHandling: "NOT_HANDLED_BY_COTANA"
    }
  };
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
  const compatibleAppCount = new Set(compatibleCapabilities.map((entry) => entry.appId)).size;
  const coverageRatio =
    capabilities.length > 0 ? Number((compatibleCapabilities.length / capabilities.length).toFixed(4)) : 0;

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
          status: AgentCapabilityStatus.ACTIVE
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
  const manifest = await getAgentRegistryManifest(appSlug);
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
      category: manifest.app.category
    },
    capability,
    qualitySignals: getAgentCapabilityQualitySignals(capability),
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
      activeCapabilityCount: activeCapabilities.length,
      totalCapabilityCount: app.agentCapabilities.length,
      readinessScore,
      blockingIssueCount: dedupedIssues.length,
      readinessStatus: status,
      issueCodes: status === "ready" ? ["ready"] : [...issueCodes],
      ready: issues.length === 0,
      issues: dedupedIssues
    };
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
  const apps = await listAgentRegistryApps();
  const gradeCounts = emptyCountRecord(QUALITY_GRADE_KEYS);
  const readinessBucketCounts = emptyReadinessStatusCounts();
  const matrixCounts = new Map<string, AgentCapabilityQualityDistribution["matrix"][number]>();
  let totalCapabilities = 0;

  for (const app of apps) {
    for (const capability of app.capabilities) {
      const qualitySignals = getAgentCapabilityQualitySignals(capability);
      const readinessBucket = getAgentCapabilityReadinessBucket(capability);
      const matrixKey = `${qualitySignals.qualityGrade}:${readinessBucket}`;

      totalCapabilities += 1;
      incrementRecord(gradeCounts, qualitySignals.qualityGrade);
      incrementRecord(readinessBucketCounts, readinessBucket);
      matrixCounts.set(matrixKey, {
        grade: qualitySignals.qualityGrade,
        readinessBucket,
        count: (matrixCounts.get(matrixKey)?.count ?? 0) + 1
      });
    }
  }

  return {
    totalCapabilities,
    gradeCounts,
    readinessBucketCounts,
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
      topCapabilityId: evaluation.topMatch?.capabilityId ?? null,
      topCategorySlug: evaluation.topMatch?.categorySlug ?? null,
      topCapabilityType: evaluation.topMatch?.capabilityType ?? null,
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
  categorySlug?: string | null;
  capabilityType?: string | null;
  readinessBucket?: AgentRegistryReadinessBucket | null;
  from?: Date | null;
  to?: Date | null;
};

export async function listAgentRegistryEvaluationLogs(options: number | AgentRegistryEvaluationLogFilters = 20) {
  const filters = typeof options === "number" ? { limit: options } : options;

  return prisma.agentRegistryEvaluationLog.findMany({
    where: {
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
      ...(filters.readinessBucket
        ? {
            topReadinessBucket: filters.readinessBucket
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

export async function recordAgentRegistryIntentTestRun(result: AgentIntentTestResult) {
  await prisma.agentRegistryIntentTestRun.create({
    data: {
      testCaseId: result.id,
      query: result.intent,
      filtersJson: JSON.parse(
        JSON.stringify({
          ...(result.filters ?? {}),
          categorySlug: result.categorySlug ?? null
        }),
      ) as Prisma.InputJsonValue,
      expectedCategorySlug: result.categorySlug ?? null,
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
