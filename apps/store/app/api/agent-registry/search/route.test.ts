import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  recordAgentRegistryEvaluationLog: vi.fn(),
  searchAgentRegistryCapabilitiesWithEvaluation: vi.fn(),
  trackServerEvent: vi.fn()
}));

vi.mock("@cotana/analytics", () => ({
  analyticsEvents: {
    agentRegistrySearched: "agent_registry_searched"
  },
  trackServerEvent: mocks.trackServerEvent
}));

vi.mock("@cotana/db", () => ({
  recordAgentRegistryEvaluationLog: mocks.recordAgentRegistryEvaluationLog
}));

vi.mock("@cotana/db/redis", () => ({
  checkRateLimit: mocks.checkRateLimit
}));

vi.mock("@cotana/search", () => ({
  searchAgentRegistryCapabilitiesWithEvaluation: mocks.searchAgentRegistryCapabilitiesWithEvaluation
}));

vi.mock("../../../../lib/request", () => ({
  getRequestIdentity: () => "test-agent"
}));

import { GET } from "./route";

describe("agent registry search route", () => {
  it("persists inspectable evaluation logs while returning matched capabilities", async () => {
    const evaluation = {
      query: "yield",
      normalizedQuery: "yield",
      filters: {
        categorySlug: "lending-yield",
        interactionModes: ["READ_ONLY"]
      },
      candidateCount: 1,
      matchedCapabilityCount: 1,
      resultCount: 1,
      topMatch: {
        appId: "app-1",
        appSlug: "harbor-yield",
        capabilityId: "cap-1",
        capabilitySlug: "compare-yield-rates",
        categorySlug: "lending-yield",
        capabilityType: "comparison",
        readinessBucket: "ready",
        similarity: 0.82,
        score: 0.91,
        qualityScore: 94,
        matchReason: "Semantic similarity 0.820 with strong metadata."
      },
      excludedCandidates: [],
      blockingIssueCount: 0
    };
    mocks.checkRateLimit.mockResolvedValue({ allowed: true });
    mocks.searchAgentRegistryCapabilitiesWithEvaluation.mockResolvedValue({
      evaluation,
      results: [
        {
          app: {
            id: "app-1",
            slug: "harbor-yield",
            name: "Harbor Yield",
            category: {
              slug: "lending-yield",
              name: "Lending & Yield"
            }
          },
          matchedCapabilities: [
            {
              id: "cap-1",
              slug: "compare-yield-rates",
              name: "Compare yield rates",
              capabilityType: "comparison",
              matchScore: 0.91,
              matchReason: "Semantic similarity 0.820 with strong metadata."
            }
          ],
          score: 0.91,
          matchReason: "Semantic similarity 0.820 with strong metadata."
        }
      ]
    });

    const response = await GET(
      new NextRequest("https://cotana.test/api/agent-registry/search?q=yield&category=lending-yield&interaction=READ_ONLY"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.recordAgentRegistryEvaluationLog).toHaveBeenCalledWith(evaluation);
    expect(payload.results[0].matchedCapabilities[0].matchReason).toContain("Semantic similarity");
    expect(payload.results[0].matchedCapabilities[0].matchScore).toBe(0.91);
    expect(payload.metadata.noExecution).toBe(true);
  });
});
