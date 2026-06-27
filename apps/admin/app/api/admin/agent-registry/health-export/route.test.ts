import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  isAdminUser: vi.fn(),
  getAgentRegistryHealthExport: vi.fn()
}));

vi.mock("@cotana/auth/authorization", () => ({
  isAdminUser: mocks.isAdminUser
}));

vi.mock("@cotana/db", () => ({
  getAgentRegistryHealthExport: mocks.getAgentRegistryHealthExport
}));

vi.mock("../../../../../lib/session", () => ({
  getSessionUser: mocks.getSessionUser
}));

import { GET } from "./route";

describe("admin registry health export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUser.mockResolvedValue({ id: "admin" });
  });

  it("requires admin access", async () => {
    mocks.isAdminUser.mockReturnValue(false);

    const response = await GET();

    expect(response.status).toBe(403);
  });

  it("returns the internal registry health payload", async () => {
    mocks.isAdminUser.mockReturnValue(true);
    mocks.getAgentRegistryHealthExport.mockResolvedValue({
      totalRegistryApps: 2,
      publishedRegistryApps: 1,
      draftRegistryApps: 1,
      pausedRegistryApps: 0,
      activeCapabilities: 3,
      averageQualityScore: 76,
      gradeDistribution: {
        excellent: 1,
        good: 1,
        needs_metadata: 1,
        unsafe: 0
      },
      readinessBucketDistribution: {
        ready: 1,
        needs_metadata: 0,
        unsafe_interaction_mode: 0,
        missing_schema: 1,
        missing_safety_notes: 0,
        weak_docs: 1,
        low_reliability: 0
      },
      blockedPublicationReasons: [{ issue: "Missing schema", count: 1 }],
      capabilityTypeCoverage: { comparison: 2 },
      authCoverage: { NONE: 1, API_KEY: 2, OAUTH2: 0, MCP: 0, CUSTOM: 0 },
      interfaceCoverage: { HTTP_API: 2, MCP_SERVER: 0, SDK: 0, WEBHOOK: 0, DATA_FEED: 0, DOCS_ONLY: 1 },
      interactionCoverage: { READ_ONLY: 3, WRITE_ACTION: 0, TRANSACTIONAL: 0, HUMAN_HANDOFF: 0 }
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      purpose: "internal_registry_qa",
      noExecution: true,
      health: {
        totalRegistryApps: 2,
        activeCapabilities: 3,
        averageQualityScore: 76
      }
    });
  });
});
