import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    app: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    appTag: {
      deleteMany: vi.fn(),
      createMany: vi.fn()
    },
    appScreenshot: {
      deleteMany: vi.fn(),
      createMany: vi.fn()
    },
    agentCapability: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    agentRegistryChangeLog: {
      create: vi.fn()
    },
    review: {
      groupBy: vi.fn()
    },
    appLike: {
      groupBy: vi.fn()
    }
  }
}));

vi.mock("../client", () => ({
  prisma: mocks.prisma
}));

vi.mock("../redis", () => ({
  incrementCounter: vi.fn()
}));

import { updateAdminApp } from "./apps";

const existingCapability = {
  id: "cap-1",
  appId: "app-1",
  name: "Compare yield",
  slug: "compare-yield",
  description: "Read-only yield comparison.",
  capabilityType: "comparison",
  authType: "API_KEY",
  interfaceType: "HTTP_API",
  interactionMode: "READ_ONLY",
  endpointUrl: "https://example.com/api/yield",
  docsUrl: "https://example.com/docs/yield",
  inputSchemaJson: { type: "object" },
  outputSchemaJson: { type: "object" },
  safetyNotes: "Read-only.",
  status: "ACTIVE",
  reliabilityScore: 0.9,
  latencyP50Ms: 500,
  manifestVersion: 1,
  updatedAt: new Date("2026-05-16T00:00:00.000Z"),
  lastReviewedAt: null,
  deprecatedAt: null,
  deprecationReason: null,
  replacementCapabilityId: null,
  replacementDocsUrl: null
};

const existingApp = {
  id: "app-1",
  slug: "harbor-yield",
  name: "Harbor Yield",
  shortDescription: "Stablecoin yield.",
  longDescription: "Compare yield products.",
  websiteUrl: "https://example.com",
  logoUrl: "https://example.com/logo.png",
  verified: true,
  verifiedNote: null,
  agentAudience: "HYBRID",
  agentListingStatus: "PUBLISHED",
  agentSummary: "Agents can compare yield products.",
  agentDocsUrl: "https://example.com/docs/agents",
  agentIntegrationNotes: "Internal note",
  agentManifestVersion: 1,
  agentLastReviewedAt: null,
  communityPick: false,
  status: "PUBLISHED",
  createdAt: new Date("2026-05-15T00:00:00.000Z"),
  updatedAt: new Date("2026-05-16T00:00:00.000Z"),
  publishedAt: new Date("2026-05-15T00:00:00.000Z"),
  category: {
    id: "cat-1",
    slug: "lending-yield",
    name: "Lending & Yield"
  },
  tags: [],
  screenshots: [],
  agentCapabilities: [existingCapability]
};

describe("admin app registry metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.app.findUnique.mockResolvedValue(existingApp);
    mocks.prisma.app.update.mockResolvedValue({ ...existingApp, agentDocsUrl: "https://example.com/docs/agents-v2" });
    mocks.prisma.agentCapability.findMany.mockResolvedValue([existingCapability]);
    mocks.prisma.agentCapability.update.mockResolvedValue({ ...existingCapability, manifestVersion: 2 });
    mocks.prisma.review.groupBy.mockResolvedValue([]);
    mocks.prisma.appLike.groupBy.mockResolvedValue([]);
  });

  it("creates change logs for registry-sensitive edits", async () => {
    await updateAdminApp(
      "app-1",
      {
        slug: "harbor-yield",
        name: "Harbor Yield",
        shortDescription: "Stablecoin yield.",
        longDescription: "Compare yield products.",
        websiteUrl: "https://example.com",
        logoUrl: "https://example.com/logo.png",
        verified: true,
        verifiedNote: null,
        agentAudience: "HYBRID",
        agentListingStatus: "PUBLISHED",
        agentSummary: "Agents can compare yield products.",
        agentDocsUrl: "https://example.com/docs/agents-v2",
        agentIntegrationNotes: "Internal note",
        categoryId: "cat-1",
        tags: [],
        screenshots: [],
        agentCapabilities: [
          {
            ...existingCapability,
            docsUrl: "https://example.com/docs/yield-v2",
            latencyP50Ms: 450
          }
        ]
      },
      "admin-1",
    );

    expect(mocks.prisma.app.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          agentManifestVersion: {
            increment: 1
          }
        })
      }),
    );
    expect(mocks.prisma.agentCapability.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          manifestVersion: {
            increment: 1
          }
        })
      }),
    );
    expect(mocks.prisma.agentRegistryChangeLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          changeType: "docs_url_change",
          fieldName: "agentDocsUrl",
          createdByUserId: "admin-1"
        })
      }),
    );
    expect(mocks.prisma.agentRegistryChangeLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          changeType: "reliability_latency_change",
          fieldName: "latencyP50Ms"
        })
      }),
    );
  });
});
