import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listAgentRegistryApps: vi.fn(),
  getCacheValue: vi.fn(),
  setCacheValue: vi.fn()
}));

vi.mock("@cotana/db", () => ({
  AppStatus: {
    PUBLISHED: "PUBLISHED"
  },
  ReviewStatus: {
    PUBLISHED: "PUBLISHED",
    FLAGGED: "FLAGGED"
  },
  getAgentCapabilityQualitySignals: (capability: {
    authType: string;
    inputSchemaJson: unknown;
    outputSchemaJson: unknown;
    safetyNotes: string | null;
    docsUrl: string | null;
    endpointUrl: string | null;
    reliabilityScore: number | null;
    latencyP50Ms: number | null;
    interactionMode: string;
  }) => ({
    schemaComplete: Boolean(capability.inputSchemaJson && capability.outputSchemaJson),
    safetyNotesPresent: Boolean(capability.safetyNotes),
    docsAvailable: Boolean(capability.docsUrl),
    endpointAvailable: Boolean(capability.endpointUrl),
    authFriction: capability.authType === "NONE" ? "none" : "low",
    latencyTier: "fast",
    reliabilityTier: "high",
    interactionSafety: capability.interactionMode === "READ_ONLY" ? "read_only" : "write_capable",
    qualityScore: 92,
    qualityGrade: "excellent"
  }),
  getAgentCapabilityReadinessBucket: () => "ready",
  listAgentRegistryApps: mocks.listAgentRegistryApps,
  prisma: {},
  recordAgentRegistryIntentTestRun: vi.fn()
}));

vi.mock("@cotana/db/redis", () => ({
  getCacheValue: mocks.getCacheValue,
  getCounterValue: vi.fn(),
  setCacheValue: mocks.setCacheValue
}));

import { runAgentIntentTestSuite, searchAgentRegistryCapabilities, searchAgentRegistryCapabilitiesWithEvaluation } from "./index";

const registryApps = [
  {
    id: "app-yield",
    slug: "harbor-yield",
    name: "Harbor Yield",
    description: "Stablecoin yield strategies.",
    longDescription: "Compare curated yield options.",
    websiteUrl: "https://example.com/harbor-yield",
    logoUrl: "https://example.com/logo.png",
    verified: true,
    communityPick: false,
    agentAudience: "HYBRID" as const,
    agentListingStatus: "PUBLISHED" as const,
    agentSummary: "Agents can monitor lending rates and compare yield products.",
    agentDocsUrl: "https://example.com/docs/agents",
    category: {
      slug: "lending-yield",
      name: "Lending & Yield"
    },
    capabilities: [
      {
        id: "cap-yield",
        name: "Compare yield rates",
        slug: "compare-yield-rates",
        description: "Returns structured lending rate and yield comparisons for requested assets.",
        capabilityType: "comparison",
        authType: "API_KEY" as const,
        interfaceType: "HTTP_API" as const,
        interactionMode: "READ_ONLY" as const,
        endpointUrl: "https://example.com/api/yields",
        docsUrl: "https://example.com/docs/agents#yields",
        inputSchemaJson: { type: "object" },
        outputSchemaJson: { type: "object" },
        safetyNotes: "Read-only discovery capability.",
        status: "ACTIVE" as const,
        reliabilityScore: 0.94,
        latencyP50Ms: 420
      }
    ]
  },
  {
    id: "app-social",
    slug: "echo-social",
    name: "Echo Social",
    description: "Community discovery.",
    longDescription: "Find creator communities.",
    websiteUrl: "https://example.com/echo-social",
    logoUrl: "https://example.com/social.png",
    verified: false,
    communityPick: false,
    agentAudience: "HYBRID" as const,
    agentListingStatus: "PUBLISHED" as const,
    agentSummary: "Agents can find public communities.",
    agentDocsUrl: "https://example.com/social/docs",
    category: {
      slug: "social",
      name: "Social"
    },
    capabilities: [
      {
        id: "cap-social",
        name: "Discover communities",
        slug: "discover-communities",
        description: "Returns public creator community matches.",
        capabilityType: "search",
        authType: "NONE" as const,
        interfaceType: "HTTP_API" as const,
        interactionMode: "READ_ONLY" as const,
        endpointUrl: "https://example.com/api/social",
        docsUrl: "https://example.com/social/docs#communities",
        inputSchemaJson: { type: "object" },
        outputSchemaJson: { type: "object" },
        safetyNotes: "Read-only public discovery.",
        status: "ACTIVE" as const,
        reliabilityScore: 0.8,
        latencyP50Ms: 700
      }
    ]
  }
];

describe("agent semantic capability search", () => {
  it("ranks matching capabilities and explains why they matched", async () => {
    process.env.OPENAI_API_KEY = "";
    mocks.getCacheValue.mockResolvedValue(null);
    mocks.listAgentRegistryApps.mockResolvedValue(registryApps);

    const results = await searchAgentRegistryCapabilities("monitor lending yield rates");

    expect(results[0]?.app.slug).toBe("harbor-yield");
    expect(results[0]?.matchedCapabilities[0]?.slug).toBe("compare-yield-rates");
    expect(results[0]?.matchedCapabilities[0]?.matchReason).toContain("Semantic similarity");
    expect(results[0]?.matchedCapabilities[0]?.qualitySignals.schemaComplete).toBe(true);
    expect(results[0]?.matchedCapabilities[0]?.qualitySignals.qualityScore).toBe(92);
    expect(results[0]?.score).toBeGreaterThan(0);
    expect(mocks.setCacheValue).toHaveBeenCalled();
  });

  it("filters by agent compatibility metadata", async () => {
    process.env.OPENAI_API_KEY = "";
    mocks.getCacheValue.mockResolvedValue(null);
    mocks.listAgentRegistryApps.mockResolvedValue(registryApps);

    const results = await searchAgentRegistryCapabilities("find public communities", {
      filters: {
        authTypes: ["NONE"],
        interfaceTypes: ["HTTP_API"],
        interactionModes: ["READ_ONLY"]
      }
    });

    expect(results[0]?.app.slug).toBe("echo-social");
    expect(results.every((result) => result.matchedCapabilities.every((capability) => capability.authType === "NONE"))).toBe(true);
  });

  it("returns an inspectable evaluation with excluded candidates", async () => {
    process.env.OPENAI_API_KEY = "";
    mocks.getCacheValue.mockResolvedValue(null);
    mocks.listAgentRegistryApps.mockResolvedValue(registryApps);

    const { evaluation } = await searchAgentRegistryCapabilitiesWithEvaluation("yield rates", {
      filters: {
        authTypes: ["NONE"]
      }
    });

    expect(evaluation.candidateCount).toBe(2);
    expect(evaluation.excludedCandidates.some((candidate) => candidate.capabilitySlug === "compare-yield-rates")).toBe(true);
    expect(evaluation.blockingIssueCount).toBeGreaterThan(0);
  });

  it("runs seeded agent intent tests against registry search", async () => {
    process.env.OPENAI_API_KEY = "";
    mocks.getCacheValue.mockResolvedValue(null);
    mocks.listAgentRegistryApps.mockResolvedValue(registryApps);

    const results = await runAgentIntentTestSuite([
      {
        id: "yield",
        intent: "monitor lending yield rates",
        expectedCapabilityTypes: ["comparison"],
        filters: {
          interactionModes: ["READ_ONLY"]
        }
      }
    ]);

    expect(results[0]?.passed).toBe(true);
    expect(results[0]?.topCapabilitySlug).toBe("compare-yield-rates");
    expect(results[0]?.failureReason).toBeNull();
  });

  it("fails seeded agent intent tests when the expected capability type misses", async () => {
    process.env.OPENAI_API_KEY = "";
    mocks.getCacheValue.mockResolvedValue(null);
    mocks.listAgentRegistryApps.mockResolvedValue(registryApps);

    const results = await runAgentIntentTestSuite([
      {
        id: "yield",
        intent: "monitor lending yield rates",
        expectedCapabilityTypes: ["data"],
        filters: {
          interactionModes: ["READ_ONLY"]
        }
      }
    ]);

    expect(results[0]?.passed).toBe(false);
    expect(results[0]?.failureReason).toContain("did not match expected profile");
  });
});
