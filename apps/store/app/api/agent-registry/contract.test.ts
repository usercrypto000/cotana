import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  trackServerEvent: vi.fn(),
  listAgentRegistryApps: vi.fn(),
  getAgentRegistryStats: vi.fn(),
  getAgentRegistryManifest: vi.fn(),
  getAgentRegistryCapabilityManifest: vi.fn(),
  getAgentRegistryCompatibilityReport: vi.fn(),
  getAgentRegistryPublicReadinessMetadata: vi.fn(),
  listAgentRegistryCapabilityTypes: vi.fn()
}));

vi.mock("@cotana/analytics", () => ({
  analyticsEvents: {
    agentRegistryDiscoveryViewed: "agent_registry_discovery_viewed",
    agentRegistryManifestViewed: "agent_registry_manifest_viewed",
    agentRegistryCapabilityViewed: "agent_registry_capability_viewed",
    agentRegistrySchemaViewed: "agent_registry_schema_viewed",
    agentRegistryPolicyViewed: "agent_registry_policy_viewed",
    agentRegistryCompatibilityViewed: "agent_registry_compatibility_viewed",
    agentRegistryCapabilitiesViewed: "agent_registry_capabilities_viewed"
  },
  trackServerEvent: mocks.trackServerEvent
}));

vi.mock("@cotana/db", () => ({
  listAgentRegistryApps: mocks.listAgentRegistryApps,
  getAgentRegistryStats: mocks.getAgentRegistryStats,
  getAgentRegistryManifest: mocks.getAgentRegistryManifest,
  getAgentRegistryCapabilityManifest: mocks.getAgentRegistryCapabilityManifest,
  getAgentRegistryCompatibilityReport: mocks.getAgentRegistryCompatibilityReport,
  getAgentRegistryPublicReadinessMetadata: mocks.getAgentRegistryPublicReadinessMetadata,
  listAgentRegistryCapabilityTypes: mocks.listAgentRegistryCapabilityTypes
}));

import { GET as discoveryGET } from "../../.well-known/cotana-agent-registry/route";
import { GET as llmsGET } from "../../llms.txt/route";
import { GET as capabilityManifestGET } from "./[slug]/capabilities/[capabilitySlug]/route";
import { GET as appManifestGET } from "./[slug]/route";
import { GET as capabilitiesGET } from "./capabilities/route";
import { GET as compatibilityGET } from "./compatibility/route";
import { GET as policyGET } from "./policy/route";
import { GET as registryGET } from "./route";
import { GET as schemaGET } from "./schema/route";

const request = new NextRequest("https://cotana.test/api/agent-registry");

describe("public agent registry contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listAgentRegistryApps.mockResolvedValue([]);
    mocks.getAgentRegistryStats.mockResolvedValue({ appCount: 0, capabilityCount: 0 });
    mocks.listAgentRegistryCapabilityTypes.mockResolvedValue([]);
    mocks.getAgentRegistryPublicReadinessMetadata.mockResolvedValue({
      registryVersion: "2026-05-17",
      schemaVersion: "2026-05-17",
      publishedAppCount: 0,
      activeCapabilityCount: 0,
      supportedCapabilityTypes: [],
      supportedAuthTypes: ["NONE", "API_KEY", "OAUTH2", "MCP", "CUSTOM"],
      supportedInterfaceTypes: ["HTTP_API", "MCP_SERVER", "SDK", "WEBHOOK", "DATA_FEED", "DOCS_ONLY"],
      supportedInteractionModes: ["READ_ONLY", "WRITE_ACTION", "TRANSACTIONAL", "HUMAN_HANDOFF"],
      docsUrl: "/agent-registry/docs",
      policyUrl: "/api/agent-registry/policy"
    });
    mocks.getAgentRegistryCompatibilityReport.mockResolvedValue({
      filters: {},
      totals: { appCount: 1, capabilityCount: 1 },
      compatible: { appCount: 1, capabilityCount: 1 },
      coverageRatio: 1,
      compatibilityConfidence: {
        score: 92,
        grade: "high",
        reasons: ["1 matching capabilities across 1 apps."],
        blockingGaps: [],
        recommendedFilterChanges: []
      },
      guidance: "Cotana found compatible discovery targets."
    });
  });

  async function expectVersionMetadata(response: Response) {
    const body = await response.json();

    expect(body).toMatchObject({
      schemaVersion: "2026-05-17",
      registryVersion: "2026-05-17",
      purpose: "discovery",
      discoveryOnly: {
        cotanaRole: "DISCOVERY_ONLY"
      },
      supportedEndpoints: expect.objectContaining({
        policy: "/api/agent-registry/policy",
        docs: "/agent-registry/docs"
      })
    });

    expect(typeof body.generatedAt).toBe("string");
    return body;
  }

  it("includes version metadata on major discovery surfaces", async () => {
    await expectVersionMetadata(await discoveryGET(request));
    await expectVersionMetadata(await registryGET(request));
    await expectVersionMetadata(await schemaGET(request));
    await expectVersionMetadata(await policyGET(request));
    await expectVersionMetadata(await capabilitiesGET(request));
    await expectVersionMetadata(await compatibilityGET(new NextRequest("https://cotana.test/api/agent-registry/compatibility?interaction=READ_ONLY")));
  });

  it("publishes useful schema objects", async () => {
    const body = await (await schemaGET(request)).json();

    expect(Object.keys(body.schemas)).toEqual(
      expect.arrayContaining([
        "RegistryDiscoveryDocument",
        "AppManifest",
        "AgentCapabilityManifest",
        "RegistryReadinessMetadata",
        "SearchResponse",
        "AgentCompatibilityReport",
        "TaxonomyResponse",
        "AgentRegistryPolicy"
      ]),
    );
  });

  it("wraps app and capability manifests with version metadata without exposing internal notes", async () => {
    mocks.getAgentRegistryManifest.mockResolvedValue({
      version: "2026-05-17",
      purpose: "discovery",
      app: {
        id: "app-1",
        slug: "harbor-yield",
        name: "Harbor Yield",
        manifestVersion: 3,
        updatedAt: new Date("2026-05-17T00:00:00.000Z"),
        lastReviewedAt: new Date("2026-05-17T00:00:00.000Z"),
        capabilities: []
      },
      qualityWarnings: ["read_only_only"],
      trustBoundary: { cotanaRole: "DISCOVERY_ONLY" }
    });
    mocks.getAgentRegistryCapabilityManifest.mockResolvedValue({
      version: "2026-05-17",
      purpose: "discovery",
      app: {
        id: "app-1",
        slug: "harbor-yield",
        name: "Harbor Yield",
        manifestVersion: 3
      },
      capability: {
        id: "cap-1",
        slug: "compare-yield",
        manifestVersion: 4,
        status: "DEPRECATED",
        deprecatedAt: new Date("2026-05-17T00:00:00.000Z"),
        deprecationReason: "Use v2.",
        replacementDocsUrl: "https://example.com/docs/v2"
      },
      qualitySignals: {},
      qualityWarnings: ["deprecated", "read_only_only"],
      usageBoundary: { cotanaCanExecute: false },
      trustBoundary: { cotanaRole: "DISCOVERY_ONLY" }
    });

    const appBody = await expectVersionMetadata(
      await appManifestGET(request, { params: Promise.resolve({ slug: "harbor-yield" }) }),
    );
    const capabilityBody = await expectVersionMetadata(
      await capabilityManifestGET(request, {
        params: Promise.resolve({ slug: "harbor-yield", capabilitySlug: "compare-yield" })
      }),
    );

    expect(appBody.app.manifestVersion).toBe(3);
    expect(appBody.qualityWarnings).toContain("read_only_only");
    expect(capabilityBody.capability).toMatchObject({
      manifestVersion: 4,
      status: "DEPRECATED",
      deprecationReason: "Use v2."
    });
    expect(capabilityBody.qualityWarnings).toContain("deprecated");
    expect(JSON.stringify(appBody)).not.toContain("agentIntegrationNotes");
    expect(JSON.stringify(capabilityBody)).not.toContain("internalNote");
  });

  it("returns public-safe readiness metadata without internal health details", async () => {
    const discoveryBody = await (await discoveryGET(request)).json();
    const registryBody = await (await registryGET(request)).json();

    expect(discoveryBody.readiness).toMatchObject({
      registryVersion: "2026-05-17",
      schemaVersion: "2026-05-17",
      docsUrl: "/agent-registry/docs",
      policyUrl: "/api/agent-registry/policy"
    });
    expect(registryBody.metadata.readiness.activeCapabilityCount).toBe(0);
    expect(JSON.stringify(discoveryBody)).not.toContain("blockedPublicationReasons");
  });

  it("links policy and docs from llms.txt", async () => {
    const response = await llmsGET();
    const body = await response.text();

    expect(body).toContain("/api/agent-registry/policy");
    expect(body).toContain("/agent-registry/docs");
    expect(body).toContain("Registry version: 2026-05-17");
  });
});
