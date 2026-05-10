import { analyticsEvents, trackServerEvent } from "@cotana/analytics";
import { NextResponse } from "next/server";
import { getRequestIdentity } from "../../../../lib/request";

export async function GET(request: Request) {
  void trackServerEvent({
    event: analyticsEvents.agentRegistrySchemaViewed,
    distinctId: getRequestIdentity(request)
  });

  return NextResponse.json({
    version: "2026-05-07",
    purpose: "discovery",
    schemas: {
      AgentCapability: {
        type: "object",
        required: [
          "id",
          "name",
          "slug",
          "description",
          "capabilityType",
          "authType",
          "interfaceType",
          "interactionMode",
          "status"
        ],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          slug: { type: "string" },
          description: { type: "string" },
          capabilityType: { type: "string" },
          authType: { enum: ["NONE", "API_KEY", "OAUTH2", "MCP", "CUSTOM"] },
          interfaceType: { enum: ["HTTP_API", "MCP_SERVER", "SDK", "WEBHOOK", "DATA_FEED", "DOCS_ONLY"] },
          interactionMode: { enum: ["READ_ONLY", "WRITE_ACTION", "TRANSACTIONAL", "HUMAN_HANDOFF"] },
          endpointUrl: { type: ["string", "null"] },
          docsUrl: { type: ["string", "null"] },
          inputSchemaJson: { type: ["object", "array", "string", "number", "boolean", "null"] },
          outputSchemaJson: { type: ["object", "array", "string", "number", "boolean", "null"] },
          safetyNotes: { type: ["string", "null"] },
          status: { enum: ["ACTIVE", "PAUSED", "DEPRECATED"] },
          reliabilityScore: { type: ["number", "null"], minimum: 0, maximum: 1 },
          latencyP50Ms: { type: ["number", "null"], minimum: 0 }
        }
      },
      AgentCapabilityQualitySignals: {
        type: "object",
        required: [
          "schemaComplete",
          "safetyNotesPresent",
          "docsAvailable",
          "endpointAvailable",
          "authFriction",
          "latencyTier",
          "reliabilityTier",
          "interactionSafety",
          "qualityScore",
          "qualityGrade"
        ],
        properties: {
          schemaComplete: { type: "boolean" },
          safetyNotesPresent: { type: "boolean" },
          docsAvailable: { type: "boolean" },
          endpointAvailable: { type: "boolean" },
          authFriction: { enum: ["none", "low", "medium", "high"] },
          latencyTier: { enum: ["fast", "standard", "slow", "unknown"] },
          reliabilityTier: { enum: ["high", "medium", "low", "unknown"] },
          interactionSafety: { enum: ["read_only", "human_handoff", "write_capable", "transactional"] },
          qualityScore: { type: "number", minimum: 0, maximum: 100 },
          qualityGrade: { enum: ["excellent", "good", "needs_metadata", "unsafe"] }
        }
      },
      AgentCapabilityManifest: {
        type: "object",
        required: ["version", "purpose", "app", "capability", "qualitySignals", "usageBoundary", "trustBoundary"],
        properties: {
          version: { type: "string" },
          purpose: { enum: ["discovery"] },
          app: { type: "object" },
          capability: { type: "object" },
          qualitySignals: { type: "object" },
          usageBoundary: { type: "object" },
          trustBoundary: { type: "object" }
        }
      },
      AgentSearchResult: {
        type: "object",
        required: ["app", "matchedCapabilities", "score", "matchReason"],
        properties: {
          app: { type: "object" },
          matchedCapabilities: { type: "array" },
          score: { type: "number" },
          matchReason: { type: "string" }
        }
      },
      AgentCapabilityTaxonomyRow: {
        type: "object",
        required: ["capabilityType", "capabilityCount", "appCount", "categories"],
        properties: {
          capabilityType: { type: "string" },
          capabilityCount: { type: "number" },
          appCount: { type: "number" },
          categories: { type: "array" },
          authTypes: { type: "object" },
          interfaceTypes: { type: "object" },
          interactionModes: { type: "object" }
        }
      },
      AgentCompatibilityReport: {
        type: "object",
        required: ["filters", "totals", "compatible", "coverageRatio", "guidance"],
        properties: {
          filters: { type: "object" },
          totals: { type: "object" },
          compatible: { type: "object" },
          coverageRatio: { type: "number" },
          guidance: { type: "string" }
        }
      },
      AgentRegistryPolicy: {
        type: "object",
        required: ["version", "purpose", "policy", "trustBoundary"],
        properties: {
          version: { type: "string" },
          purpose: { enum: ["discovery"] },
          policy: { type: "object" },
          trustBoundary: { type: "object" }
        }
      }
    },
    trustBoundary: {
      cotanaRole: "DISCOVERY_ONLY",
      execution: "EXTERNAL_APP",
      credentialHandling: "NOT_HANDLED_BY_COTANA"
    }
  });
}
