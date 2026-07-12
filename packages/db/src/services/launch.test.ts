import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    $queryRaw: vi.fn(),
    app: {
      count: vi.fn(),
      findUnique: vi.fn()
    },
    editorialShelf: {
      count: vi.fn()
    },
    editorialShelfItem: {
      count: vi.fn()
    },
    discoveryInsightSnapshot: {
      findFirst: vi.fn(),
      count: vi.fn()
    },
    category: {
      count: vi.fn()
    },
    agentCapability: {
      count: vi.fn()
    }
  },
  getRedisHealth: vi.fn(),
  getCatalogCoverageAudit: vi.fn(),
  getAgentRegistryHealthExport: vi.fn(),
  listAgentRegistryIntentTestRuns: vi.fn(),
  listAgentRegistryQualityRows: vi.fn()
}));

vi.mock("../client", () => ({
  prisma: mocks.prisma
}));

vi.mock("../redis", () => ({
  getRedisHealth: mocks.getRedisHealth
}));

vi.mock("./agents", () => ({
  getCatalogCoverageAudit: mocks.getCatalogCoverageAudit,
  getAgentRegistryHealthExport: mocks.getAgentRegistryHealthExport,
  listAgentRegistryIntentTestRuns: mocks.listAgentRegistryIntentTestRuns,
  listAgentRegistryQualityRows: mocks.listAgentRegistryQualityRows
}));

import { getDatabaseHealth, getEmptyStateMessage, getLaunchChecklist, getLaunchHealth } from "./launch";

describe("launch readiness helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = "postgresql://localhost/cotana";
    process.env.ADMIN_ALLOWLIST_EMAIL = "admin@cotana.app";
    process.env.COVALENT_TIMEOUT_MS = "10000";
    process.env.COTANA_SMOKE_TESTS_PASSING = "false";
    process.env.COTANA_E2E_TESTS_PASSING = "false";
    process.env.COTANA_MIGRATION_STATUS_CHECKED = "false";
    process.env.COTANA_PRODUCTION_SEED_GUARD_ACTIVE = "false";
    process.env.COTANA_DOCS_UPDATED = "false";
    process.env.COTANA_KNOWN_WARNINGS_ACKNOWLEDGED = "false";
    delete process.env.VERCEL_ENV;
    delete process.env.REDIS_URL;
    delete process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    delete process.env.PRIVY_APP_SECRET;
    delete process.env.COTANA_SESSION_SECRET;
    delete process.env.NEXT_PUBLIC_STORE_URL;
    delete process.env.NEXT_PUBLIC_ADMIN_URL;
    mocks.prisma.$queryRaw.mockResolvedValue([{ one: 1 }]);
    mocks.prisma.app.count.mockResolvedValue(8);
    mocks.prisma.app.findUnique.mockResolvedValue({
      id: "app_harbor",
      verificationStatus: "verified",
      publisherName: "Harbor Labs",
      reviewSummary: "Reviewed for beta trust metadata."
    });
    mocks.prisma.editorialShelf.count.mockResolvedValue(2);
    mocks.prisma.editorialShelfItem.count.mockResolvedValue(6);
    mocks.prisma.discoveryInsightSnapshot.findFirst.mockResolvedValue({ computedAt: new Date("2026-05-17T00:00:00.000Z") });
    mocks.prisma.discoveryInsightSnapshot.count.mockResolvedValue(6);
    mocks.prisma.category.count.mockResolvedValue(4);
    mocks.prisma.agentCapability.count.mockResolvedValue(5);
    mocks.getRedisHealth.mockResolvedValue({ reachable: true, fallbackActive: false, mode: "redis" });
  });

  it("checks database reachability", async () => {
    await expect(getDatabaseHealth()).resolves.toEqual({ reachable: true });

    mocks.prisma.$queryRaw.mockRejectedValueOnce(new Error("down"));
    await expect(getDatabaseHealth()).resolves.toEqual({ reachable: false });
  });

  it("returns deployment health payloads", async () => {
    const health = await getLaunchHealth("store");

    expect(health).toMatchObject({
      app: "cotana-store",
      environment: "test",
      databaseReachable: true,
      redisReachable: true,
      registryVersion: "2026-05-17"
    });
    expect(typeof health.timestamp).toBe("string");
  });

  it("allows Vercel preview to return ok_with_warnings for optional preview dependencies", async () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    mocks.getRedisHealth.mockResolvedValueOnce({ reachable: false, fallbackActive: true, mode: "memory" });

    const health = await getLaunchHealth("store");

    expect(health.status).toBe("ok_with_warnings");
    expect(health.dependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "redis", status: "warning", required: false }),
        expect.objectContaining({ id: "privy-client", status: "warning", required: false })
      ]),
    );
    expect(health.productionReadiness.missingRequired).toEqual(expect.arrayContaining(["redis", "privy-client"]));
  });

  it("keeps production strict for missing required dependencies", async () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "production";
    mocks.getRedisHealth.mockResolvedValueOnce({ reachable: false, fallbackActive: true, mode: "memory" });

    const health = await getLaunchHealth("store");

    expect(health.status).toBe("degraded");
    expect(health.dependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "redis", status: "fail", required: true }),
        expect.objectContaining({ id: "privy-client", status: "fail", required: true })
      ]),
    );
  });

  it("marks database failure as unhealthy", async () => {
    mocks.prisma.$queryRaw.mockRejectedValueOnce(new Error("down"));

    const health = await getLaunchHealth("registry");

    expect(health.status).toBe("unhealthy");
    expect(health.dependencies).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "database", status: "fail" })]),
    );
  });

  it("aggregates launch checklist status", async () => {
    mocks.getCatalogCoverageAudit.mockResolvedValue({
      generatedAt: new Date(),
      humanCategories: [
        {
          totalPublishedApps: 2,
          appsWithScreenshots: 1,
          appsWithUpdates: 1,
          warnings: ["Thin category"]
        }
      ],
      agentCategories: [],
      capabilityTypes: [],
      warnings: ["Thin category"]
    });
    mocks.getAgentRegistryHealthExport.mockResolvedValue({
      activeCapabilities: 3,
      averageQualityScore: 84,
      readinessBucketDistribution: {
        ready: 2,
        needs_metadata: 0,
        unsafe_interaction_mode: 0,
        missing_schema: 0,
        missing_safety_notes: 0,
        weak_docs: 1,
        low_reliability: 0
      }
    });
    mocks.listAgentRegistryQualityRows.mockResolvedValue([
      {
        agentListingStatus: "PUBLISHED",
        deprecatedCapabilityCount: 0,
        activeCapabilityCount: 1
      }
    ]);
    mocks.listAgentRegistryIntentTestRuns.mockResolvedValue([
      {
        testCaseId: "red-empty",
        testSetVersion: "red-team-1",
        passed: true,
        ranAt: new Date()
      },
      {
        testCaseId: "yield",
        testSetVersion: "seeded-1",
        passed: false,
        ranAt: new Date()
      }
    ]);

    const checklist = await getLaunchChecklist();

    expect(checklist.status).toBe("fail");
    expect(checklist.summary).toMatchObject({
      failingIntentTests: 1,
      failingRedTeamTests: 0,
      thinCategoryCount: 1,
      weakDocsCapabilities: 1
    });
    expect(checklist.seedVisibility).toMatchObject({
      publishedAppCount: 8,
      homepageShelfItemCount: 6,
      trendingItemCount: 6,
      risingItemCount: 6,
      homepageReady: true
    });
    expect(checklist.items.some((item) => item.id === "e2e-tests" && item.status === "warning")).toBe(true);
    expect(checklist.items.some((item) => item.id === "harbor-yield-trust-profile" && item.status === "pass")).toBe(
      true,
    );
    expect(checklist.items.some((item) => item.id === "seed-fixture-review-validation" && item.status === "pass")).toBe(
      true,
    );
  });

  it("includes production readiness acknowledgements in the checklist", async () => {
    process.env.COTANA_SMOKE_TESTS_PASSING = "true";
    process.env.COTANA_E2E_TESTS_PASSING = "true";
    process.env.COTANA_MIGRATION_STATUS_CHECKED = "true";
    process.env.COTANA_PRODUCTION_SEED_GUARD_ACTIVE = "true";
    process.env.COTANA_DOCS_UPDATED = "true";
    process.env.COTANA_KNOWN_WARNINGS_ACKNOWLEDGED = "true";
    mocks.getCatalogCoverageAudit.mockResolvedValue({
      generatedAt: new Date(),
      humanCategories: [],
      agentCategories: [],
      capabilityTypes: [],
      warnings: []
    });
    mocks.getAgentRegistryHealthExport.mockResolvedValue({
      activeCapabilities: 1,
      averageQualityScore: 90,
      readinessBucketDistribution: {
        ready: 1,
        needs_metadata: 0,
        unsafe_interaction_mode: 0,
        missing_schema: 0,
        missing_safety_notes: 0,
        weak_docs: 0,
        low_reliability: 0
      }
    });
    mocks.listAgentRegistryQualityRows.mockResolvedValue([]);
    mocks.listAgentRegistryIntentTestRuns.mockResolvedValue([]);

    const checklist = await getLaunchChecklist();

    expect(checklist.items.find((item) => item.id === "smoke-tests")?.status).toBe("pass");
    expect(checklist.items.find((item) => item.id === "e2e-tests")?.status).toBe("pass");
    expect(checklist.summary).toMatchObject({
      smokeTestsPassing: true,
      e2eTestsPassing: true,
      migrationStatusChecked: true,
      productionSeedGuardActive: true
    });
  });

  it("centralizes launch-critical empty-state copy", () => {
    expect(getEmptyStateMessage("registry")).toContain("No registry capabilities");
    expect(getEmptyStateMessage("redis")).toContain("in-memory fallback");
  });
});
