import { vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    app: {
      findMany: vi.fn(),
      findFirst: vi.fn()
    },
    category: {
      findMany: vi.fn()
    },
    configKV: {
      findUnique: vi.fn()
    },
    agentRegistryEvaluationLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn()
    },
    agentRegistryIntentTestRun: {
      create: vi.fn(),
      findMany: vi.fn()
    }
  }
}));

vi.mock("../client", () => ({
  prisma: mocks.prisma
}));

import {
  compareLatestAgentRegistryIntentTestRuns,
  classifyAgentSeedFixture,
  getCatalogCoverageAudit,
  getAgentRegistryHealthExport,
  getAgentRegistryManifest,
  getAgentRegistryPublicReadinessMetadata,
  getAgentRegistryCompatibilityReport,
  getAgentCapabilityQualityDistribution,
  getAgentRegistryCapabilityManifest,
  getAgentRegistryQualitySummary,
  listAgentIntentTestCases,
  listAgentRedTeamTestCases,
  listAgentRegistryEvaluationLogs,
  listAgentRegistryIntentTestRuns,
  recordAgentRegistryEvaluationLog,
  recordAgentRegistryIntentTestRun,
  getAgentRegistryStats,
  getAgentCapabilityQualitySignals,
  getAgentCapabilityReadinessBucket,
  listAgentRegistryApps,
  listAgentRegistryCapabilityTypes,
  listAgentRegistryCategories,
  listAgentRegistryQualityRows
} from "./agents";

const appRecord = {
  id: "app-1",
  slug: "harbor-yield",
  name: "Harbor Yield",
  shortDescription: "Stablecoin yield strategies.",
  longDescription: "Compare curated yield options.",
  websiteUrl: "https://example.com",
  logoUrl: "https://example.com/logo.png",
  verified: true,
  communityPick: false,
  status: "PUBLISHED",
  agentAudience: "HYBRID",
  agentListingStatus: "PUBLISHED",
  agentSummary: "Agents can compare yield products.",
  agentDocsUrl: "https://example.com/docs/agents",
  category: {
    slug: "lending-yield",
    name: "Lending & Yield"
  },
  agentCapabilities: [
    {
      id: "cap-1",
      name: "Compare yield options",
      slug: "compare-yield-options",
      description: "Returns structured yield comparisons.",
      capabilityType: "comparison",
      authType: "API_KEY",
      interfaceType: "HTTP_API",
      interactionMode: "READ_ONLY",
      endpointUrl: "https://example.com/api/agent",
      docsUrl: "https://example.com/docs/agents#compare",
      inputSchemaJson: { type: "object" },
      outputSchemaJson: { type: "object" },
      safetyNotes: "Read-only.",
      status: "ACTIVE",
      reliabilityScore: 0.9,
      latencyP50Ms: 500
    }
  ]
};

describe("agent registry service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists published agent-enabled apps", async () => {
    mocks.prisma.app.findMany.mockResolvedValue([appRecord]);

    const apps = await listAgentRegistryApps();

    expect(mocks.prisma.app.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PUBLISHED",
          agentAudience: {
            in: ["AGENT", "HYBRID"]
          },
          agentListingStatus: "PUBLISHED",
          agentCapabilities: {
            some: {
              status: "ACTIVE"
            }
          }
        })
      }),
    );
    expect(apps[0]?.capabilities[0]?.slug).toBe("compare-yield-options");
  });

  it("returns a single manifest by slug", async () => {
    mocks.prisma.app.findFirst.mockResolvedValue(appRecord);

    const manifest = await getAgentRegistryManifest("harbor-yield");

    expect(manifest?.purpose).toBe("discovery");
    expect(manifest?.app.slug).toBe("harbor-yield");
    expect(manifest?.app.capabilities).toHaveLength(1);
  });

  it("returns a single capability manifest by app and capability slug", async () => {
    mocks.prisma.app.findFirst.mockResolvedValue(appRecord);

    const manifest = await getAgentRegistryCapabilityManifest("harbor-yield", "compare-yield-options");

    expect(manifest?.purpose).toBe("discovery");
    expect(manifest?.capability.slug).toBe("compare-yield-options");
    expect(manifest?.usageBoundary.cotanaCanExecute).toBe(false);
    expect(manifest?.qualitySignals.schemaComplete).toBe(true);
  });

  it("can explain deprecated capabilities on direct manifest reads", async () => {
    mocks.prisma.app.findFirst.mockResolvedValue({
      ...appRecord,
      agentCapabilities: [
        {
          ...appRecord.agentCapabilities[0],
          status: "DEPRECATED",
          deprecatedAt: new Date("2026-05-17T00:00:00.000Z"),
          deprecationReason: "Use the v2 capability.",
          replacementDocsUrl: "https://example.com/docs/v2"
        }
      ]
    });

    const manifest = await getAgentRegistryCapabilityManifest("harbor-yield", "compare-yield-options");

    expect(manifest?.capability.status).toBe("DEPRECATED");
    expect(manifest?.capability.deprecationReason).toBe("Use the v2 capability.");
    expect(manifest?.capability.replacementDocsUrl).toBe("https://example.com/docs/v2");
    expect(manifest?.qualityWarnings).toContain("deprecated");
    expect(manifest?.qualityWarnings).toContain("read_only_only");
    expect(mocks.prisma.app.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          slug: "harbor-yield",
          agentCapabilities: {
            some: {
              slug: "compare-yield-options",
              status: {
                in: ["ACTIVE", "DEPRECATED"]
              }
            }
          }
        })
      }),
    );
  });

  it("searches by matched capability", async () => {
    mocks.prisma.app.findMany.mockResolvedValue([appRecord]);

    const { searchAgentRegistryCapabilities } = await import("./agents");
    const results = await searchAgentRegistryCapabilities("yield comparison");

    expect(results[0]?.app.slug).toBe("harbor-yield");
    expect(results[0]?.matchedCapabilities[0]?.slug).toBe("compare-yield-options");
  });

  it("reports agent registry quality issues", async () => {
    mocks.prisma.app.findMany.mockResolvedValue([
      {
        ...appRecord,
        agentSummary: "",
        agentCapabilities: [
          {
            ...appRecord.agentCapabilities[0],
            inputSchemaJson: null,
            safetyNotes: ""
          }
        ]
      }
    ]);

    const rows = await listAgentRegistryQualityRows();

    expect(rows[0]?.ready).toBe(false);
    expect(rows[0]?.readinessStatus).toBe("missing_schema");
    expect(rows[0]?.issueCodes).toContain("missing_schema");
    expect(rows[0]?.readinessScore).toBeLessThan(100);
    expect(rows[0]?.blockingIssueCount).toBeGreaterThan(0);
    expect(rows[0]?.issues).toContain("Agent summary is missing or too short.");
    expect(rows[0]?.issues.some((issue) => issue.includes("input and output schemas"))).toBe(true);
  });

  it("summarizes agent registry quality", async () => {
    mocks.prisma.app.findMany.mockResolvedValue([
      appRecord,
      {
        ...appRecord,
        id: "app-2",
        agentSummary: "",
        agentCapabilities: []
      }
    ]);

    const summary = await getAgentRegistryQualitySummary();

    expect(summary.totalListings).toBe(2);
    expect(summary.readyListings).toBe(1);
    expect(summary.needsWorkListings).toBe(1);
    expect(summary.statusCounts.ready).toBe(1);
    expect(summary.statusCounts.needs_metadata).toBe(1);
    expect(summary.topIssues.length).toBeGreaterThan(0);
  });

  it("summarizes registry categories and stats", async () => {
    mocks.prisma.app.findMany.mockResolvedValue([appRecord]);

    const categories = await listAgentRegistryCategories();
    const stats = await getAgentRegistryStats();

    expect(categories[0]).toMatchObject({
      slug: "lending-yield",
      appCount: 1,
      capabilityCount: 1
    });
    expect(stats).toMatchObject({
      appCount: 1,
      capabilityCount: 1,
      categoryCount: 1
    });
    expect(stats.authTypes.API_KEY).toBe(1);
  });

  it("builds capability taxonomy rows", async () => {
    mocks.prisma.app.findMany.mockResolvedValue([appRecord]);

    const rows = await listAgentRegistryCapabilityTypes();

    expect(rows[0]).toMatchObject({
      capabilityType: "comparison",
      capabilityCount: 1,
      appCount: 1
    });
    expect(rows[0]?.categories[0]).toMatchObject({
      slug: "lending-yield",
      capabilityCount: 1
    });
    expect(rows[0]?.authTypes.API_KEY).toBe(1);
  });

  it("reports compatibility coverage for outside agents", async () => {
    mocks.prisma.app.findMany.mockResolvedValue([appRecord]);

    const report = await getAgentRegistryCompatibilityReport({
      authTypes: ["API_KEY"],
      interfaceTypes: ["HTTP_API"],
      interactionModes: ["READ_ONLY"]
    });

    expect(report.totals.capabilityCount).toBe(1);
    expect(report.compatible.capabilityCount).toBe(1);
    expect(report.coverageRatio).toBe(1);
    expect(report.compatibilityConfidence.grade).toBe("high");
    expect(report.guidance).toContain("discovery targets");
  });

  it("computes medium and low compatibility confidence deterministically", async () => {
    mocks.prisma.app.findMany.mockResolvedValue([
      {
        ...appRecord,
        agentCapabilities: [
          {
            ...appRecord.agentCapabilities[0],
            inputSchemaJson: null,
            outputSchemaJson: null,
            safetyNotes: "",
            reliabilityScore: 0.2
          }
        ]
      }
    ]);

    const weakReport = await getAgentRegistryCompatibilityReport({
      interactionModes: ["READ_ONLY"]
    });
    const emptyReport = await getAgentRegistryCompatibilityReport({
      authTypes: ["MCP"]
    });

    expect(weakReport.compatibilityConfidence.grade).toBe("medium");
    expect(weakReport.compatibilityConfidence.blockingGaps).toEqual(
      expect.arrayContaining(["Schema coverage is below 80%.", "Safety-note coverage is below 80%."]),
    );
    expect(emptyReport.compatibilityConfidence.grade).toBe("low");
    expect(emptyReport.compatibilityConfidence.blockingGaps).toContain("No compatible capabilities matched these filters.");
  });

  it("classifies capability quality signals", () => {
    const qualitySignals = getAgentCapabilityQualitySignals(appRecord.agentCapabilities[0]);

    expect(qualitySignals).toMatchObject({
      schemaComplete: true,
      safetyNotesPresent: true,
      docsAvailable: true,
      endpointAvailable: true,
      authFriction: "low",
      reliabilityTier: "high",
      interactionSafety: "read_only",
      qualityGrade: "excellent"
    });
    expect(qualitySignals.qualityScore).toBeGreaterThanOrEqual(85);
    expect(getAgentCapabilityReadinessBucket(appRecord.agentCapabilities[0])).toBe("ready");
  });

  it("summarizes capability quality distribution by grade and readiness bucket", async () => {
    mocks.prisma.app.findMany.mockResolvedValue([appRecord]);

    const distribution = await getAgentCapabilityQualityDistribution();

    expect(distribution.totalCapabilities).toBe(1);
    expect(distribution.gradeCounts.excellent).toBe(1);
    expect(distribution.readinessBucketCounts.ready).toBe(1);
  });

  it("loads seeded agent intent test cases from config", async () => {
    mocks.prisma.configKV.findUnique.mockResolvedValue({
      valueJson: [
        {
          id: "yield",
          intent: "find read-only yield rates",
          expectedCapabilityTypes: ["comparison"]
        }
      ]
    });

    const testCases = await listAgentIntentTestCases();

    expect(testCases[0]?.id).toBe("yield");
  });

  it("loads red-team registry query cases from config", async () => {
    mocks.prisma.configKV.findUnique.mockResolvedValue({
      valueJson: [
        {
          id: "red-empty",
          suiteType: "red_team",
          intent: "",
          expectedEmptyResult: true
        }
      ]
    });

    const testCases = await listAgentRedTeamTestCases();

    expect(testCases[0]).toMatchObject({
      id: "red-empty",
      suiteType: "red_team",
      expectedEmptyResult: true
    });
  });

  it("records and lists agent registry evaluation logs", async () => {
    mocks.prisma.agentRegistryEvaluationLog.create.mockResolvedValue({});
    mocks.prisma.agentRegistryEvaluationLog.findMany.mockResolvedValue([{ id: "log-1" }]);

    await recordAgentRegistryEvaluationLog({
      query: "yield",
      normalizedQuery: "yield",
      filters: {},
      candidateCount: 1,
      matchedCapabilityCount: 1,
      resultCount: 1,
      topMatch: {
        appId: "app-1",
        appSlug: "harbor-yield",
        capabilityId: "cap-1",
        capabilitySlug: "compare-yield-options",
        categorySlug: "lending-yield",
        capabilityType: "comparison",
        authType: "API_KEY",
        interfaceType: "HTTP_API",
        interactionMode: "READ_ONLY",
        readinessBucket: "ready",
        similarity: 0.8,
        score: 0.9,
        qualityScore: 92,
        matchReason: "Matched."
      },
      excludedCandidates: [],
      blockingIssueCount: 0
    });
    const logs = await listAgentRegistryEvaluationLogs({
      limit: 1,
      query: "yield",
      categorySlug: "lending-yield",
      capabilityType: "comparison",
      authType: "API_KEY",
      interfaceType: "HTTP_API",
      interactionMode: "READ_ONLY",
      readinessBucket: "ready"
    });

    expect(mocks.prisma.agentRegistryEvaluationLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          topCategorySlug: "lending-yield",
          topCapabilityType: "comparison",
          topAuthType: "API_KEY",
          topInterfaceType: "HTTP_API",
          topInteractionMode: "READ_ONLY",
          topReadinessBucket: "ready"
        })
      }),
    );
    expect(mocks.prisma.agentRegistryEvaluationLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          topCategorySlug: "lending-yield",
          topCapabilityType: "comparison",
          topAuthType: "API_KEY",
          topInterfaceType: "HTTP_API",
          topInteractionMode: "READ_ONLY",
          topReadinessBucket: "ready"
        })
      }),
    );
    expect(logs[0]?.id).toBe("log-1");
  });

  it("records and lists agent intent test run history", async () => {
    mocks.prisma.agentRegistryIntentTestRun.create.mockResolvedValue({});
    mocks.prisma.agentRegistryIntentTestRun.findMany.mockResolvedValue([{ id: "run-1" }]);

    await recordAgentRegistryIntentTestRun({
      id: "yield",
      testSetVersion: "seeded-1",
      intent: "find yield rates",
      categorySlug: "lending-yield",
      expectedAppSlugs: ["harbor-yield"],
      expectedCapabilityTypes: ["comparison"],
      filters: {
        interactionModes: ["READ_ONLY"]
      },
      passed: true,
      topAppId: "app-1",
      topAppSlug: "harbor-yield",
      topCategorySlug: "lending-yield",
      topCapabilityId: "cap-1",
      topCapabilitySlug: "compare-yield-options",
      topCapabilityType: "comparison",
      topScore: 0.9,
      topQualityScore: 92,
      topMatchReason: "Semantic similarity 0.800.",
      reason: "Top capability matched the expected intent profile.",
      failureReason: null
    });
    const runs = await listAgentRegistryIntentTestRuns(1);

    expect(mocks.prisma.agentRegistryIntentTestRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          testCaseId: "yield",
          testSetVersion: "seeded-1",
          query: "find yield rates",
          expectedAppSlugsJson: ["harbor-yield"],
          topMatchedAppSlug: "harbor-yield",
          topMatchedCapabilitySlug: "compare-yield-options",
          qualityScore: 92,
          passed: true,
          failureReason: null
        })
      }),
    );
    expect(runs[0]?.id).toBe("run-1");
  });

  it("compares latest intent test run history against the previous run", async () => {
    mocks.prisma.agentRegistryIntentTestRun.findMany.mockResolvedValue([
      {
        testSetVersion: "seeded-2",
        testCaseId: "yield",
        query: "find yield rates",
        filtersJson: {},
        expectedCategorySlug: "lending-yield",
        expectedAppSlugsJson: ["harbor-yield"],
        expectedCapabilityTypesJson: ["comparison"],
        expectedCapabilitySlugsJson: null,
        topMatchedAppId: "app-2",
        topMatchedAppSlug: "signal-bet",
        topMatchedCategorySlug: "prediction-markets",
        topMatchedCapabilityId: "cap-2",
        topMatchedCapabilitySlug: "find-active-markets",
        topMatchedCapabilityType: "search",
        score: 0.7,
        qualityScore: 82,
        matchReason: "Matched wrong category.",
        passed: false,
        failureReason: "Top category prediction-markets did not match expected category lending-yield.",
        ranAt: new Date("2026-05-17T10:00:00.000Z")
      },
      {
        testSetVersion: "seeded-1",
        testCaseId: "yield",
        query: "find yield rates",
        filtersJson: {},
        expectedCategorySlug: "lending-yield",
        expectedAppSlugsJson: ["harbor-yield"],
        expectedCapabilityTypesJson: ["comparison"],
        expectedCapabilitySlugsJson: null,
        topMatchedAppId: "app-1",
        topMatchedAppSlug: "harbor-yield",
        topMatchedCategorySlug: "lending-yield",
        topMatchedCapabilityId: "cap-1",
        topMatchedCapabilitySlug: "compare-yield-options",
        topMatchedCapabilityType: "comparison",
        score: 0.9,
        qualityScore: 92,
        matchReason: "Matched.",
        passed: true,
        failureReason: null,
        ranAt: new Date("2026-05-16T10:00:00.000Z")
      }
    ]);

    const comparison = await compareLatestAgentRegistryIntentTestRuns();

    expect(comparison.latestVersion).toBe("seeded-2");
    expect(comparison.previousVersion).toBe("seeded-1");
    expect(comparison.newlyFailing[0]?.id).toBe("yield");
  });

  it("classifies weak metadata fixtures as blocked or unsafe", () => {
    const missingSchema = getAgentCapabilityReadinessBucket({
      ...appRecord.agentCapabilities[0],
      inputSchemaJson: null,
      outputSchemaJson: null
    });
    const unsafe = getAgentCapabilityReadinessBucket({
      ...appRecord.agentCapabilities[0],
      interactionMode: "WRITE_ACTION"
    });

    expect(missingSchema).toBe("missing_schema");
    expect(unsafe).toBe("unsafe_interaction_mode");
    expect(
      classifyAgentSeedFixture({
        agentCapabilities: [
          {
            ...appRecord.agentCapabilities[0],
            inputSchemaJson: null
          }
        ]
      }),
    ).toBe("weak");
    expect(
      classifyAgentSeedFixture({
        agentListingStatus: "PAUSED",
        agentCapabilities: [appRecord.agentCapabilities[0]]
      }),
    ).toBe("paused");
  });

  it("builds a catalog coverage audit with thin-area warnings", async () => {
    mocks.prisma.category.findMany.mockResolvedValue([
      {
        id: "cat-1",
        slug: "lending-yield",
        name: "Lending & Yield",
        sortOrder: 1,
        apps: [
          {
            ...appRecord,
            screenshots: [{ id: "shot-1" }],
            reviews: [],
            updates: [{ id: "update-1" }],
            signalSnapshots: [],
            agentCapabilities: [appRecord.agentCapabilities[0]]
          }
        ]
      }
    ]);

    const audit = await getCatalogCoverageAudit();

    expect(audit.humanCategories[0]).toMatchObject({
      totalPublishedApps: 1,
      appsWithScreenshots: 1,
      appsWithUpdates: 1
    });
    expect(audit.agentCategories[0]).toMatchObject({
      publishedRegistryListings: 1,
      activeCapabilities: 1,
      schemaCoverage: 1
    });
    expect(audit.warnings.some((warning) => warning.includes("fewer than 3 published human apps"))).toBe(true);
    expect(audit.warnings.some((warning) => warning.includes("fewer than 2 agent-ready listings"))).toBe(true);
  });

  it("returns public-safe readiness metadata", async () => {
    mocks.prisma.app.findMany.mockResolvedValue([appRecord]);

    const readiness = await getAgentRegistryPublicReadinessMetadata();

    expect(readiness).toMatchObject({
      registryVersion: "2026-05-17",
      schemaVersion: "2026-05-17",
      publishedAppCount: 1,
      activeCapabilityCount: 1,
      docsUrl: "/agent-registry/docs",
      policyUrl: "/api/agent-registry/policy"
    });
    expect(readiness.supportedCapabilityTypes).toContain("comparison");
  });

  it("exports compact registry health", async () => {
    mocks.prisma.app.findMany.mockResolvedValue([appRecord]);

    const health = await getAgentRegistryHealthExport();

    expect(health).toMatchObject({
      totalRegistryApps: 1,
      publishedRegistryApps: 1,
      activeCapabilities: 1
    });
    expect(health.gradeDistribution.excellent).toBe(1);
    expect(health.readinessBucketDistribution.ready).toBe(1);
    expect(health.authCoverage.API_KEY).toBe(1);
  });
});
