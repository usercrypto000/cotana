import { analyticsEvents, trackServerEvent } from "@cotana/analytics";
import { buildRegistryVersionMetadata, cotanaRegistryContract } from "@cotana/config";
import { NextResponse } from "next/server";
import { getRequestIdentity } from "../../../../lib/request";

export async function GET(request: Request) {
  void trackServerEvent({
    event: analyticsEvents.agentRegistrySchemaViewed,
    distinctId: getRequestIdentity(request)
  });

  return NextResponse.json({
    ...buildRegistryVersionMetadata(),
    version: cotanaRegistryContract.registryVersion,
    purpose: "discovery",
    schemas: {
      RegistryVersionMetadata: {
        type: "object",
        required: ["schemaVersion", "registryVersion", "generatedAt", "discoveryOnly", "supportedEndpoints"],
        properties: {
          schemaVersion: { type: "string" },
          registryVersion: { type: "string" },
          generatedAt: { type: "string", format: "date-time" },
          discoveryOnly: { type: "object" },
          supportedEndpoints: { type: "object" }
        }
      },
      RegistryDiscoveryDocument: {
        type: "object",
        required: ["schemaVersion", "registryVersion", "generatedAt", "name", "purpose", "readiness", "endpoints", "trustBoundary"],
        properties: {
          schemaVersion: { type: "string" },
          registryVersion: { type: "string" },
          generatedAt: { type: "string" },
          name: { type: "string" },
          purpose: { enum: ["discovery"] },
          readiness: { type: "object" },
          endpoints: { type: "object" },
          supportedFilters: { type: "object" },
          trustBoundary: { type: "object" }
        }
      },
      AppManifest: {
        type: "object",
        required: ["schemaVersion", "registryVersion", "generatedAt", "version", "purpose", "app", "qualityWarnings", "trustBoundary"],
        properties: {
          schemaVersion: { type: "string" },
          registryVersion: { type: "string" },
          generatedAt: { type: "string" },
          version: { type: "string" },
          purpose: { enum: ["discovery"] },
          app: { type: "object" },
          qualityWarnings: {
            type: "array",
            items: {
              enum: ["deprecated", "docs_missing", "schema_partial", "reliability_unknown", "human_handoff_required", "read_only_only"]
            }
          },
          trustBoundary: { type: "object" }
        }
      },
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
          latencyP50Ms: { type: ["number", "null"], minimum: 0 },
          manifestVersion: { type: "number" },
          updatedAt: { type: "string" },
          lastReviewedAt: { type: ["string", "null"] },
          deprecatedAt: { type: ["string", "null"] },
          deprecationReason: { type: ["string", "null"] },
          replacementCapabilityId: { type: ["string", "null"] },
          replacementDocsUrl: { type: ["string", "null"] }
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
        required: ["version", "purpose", "app", "capability", "qualitySignals", "qualityWarnings", "usageBoundary", "trustBoundary"],
        properties: {
          version: { type: "string" },
          purpose: { enum: ["discovery"] },
          app: { type: "object" },
          capability: { type: "object" },
          qualitySignals: { type: "object" },
          qualityWarnings: {
            type: "array",
            items: {
              enum: ["deprecated", "docs_missing", "schema_partial", "reliability_unknown", "human_handoff_required", "read_only_only"]
            }
          },
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
      SearchResponse: {
        type: "object",
        required: ["schemaVersion", "registryVersion", "generatedAt", "purpose", "query", "filters", "metadata", "evaluation", "trustBoundary", "results"],
        properties: {
          schemaVersion: { type: "string" },
          registryVersion: { type: "string" },
          generatedAt: { type: "string" },
          purpose: { enum: ["discovery"] },
          query: { type: "string" },
          filters: { type: "object" },
          metadata: { type: "object" },
          evaluation: { type: "object" },
          trustBoundary: { type: "object" },
          results: { type: "array" }
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
        required: ["filters", "totals", "compatible", "coverageRatio", "compatibilityConfidence", "guidance"],
        properties: {
          filters: { type: "object" },
          totals: { type: "object" },
          compatible: { type: "object" },
          coverageRatio: { type: "number" },
          compatibilityConfidence: { type: "object" },
          guidance: { type: "string" }
        }
      },
      TaxonomyResponse: {
        type: "object",
        required: ["schemaVersion", "registryVersion", "generatedAt", "purpose", "capabilityTypes"],
        properties: {
          schemaVersion: { type: "string" },
          registryVersion: { type: "string" },
          generatedAt: { type: "string" },
          purpose: { enum: ["discovery"] },
          capabilityTypes: { type: "array" }
        }
      },
      RegistryReadinessMetadata: {
        type: "object",
        required: [
          "registryVersion",
          "schemaVersion",
          "publishedAppCount",
          "activeCapabilityCount",
          "supportedCapabilityTypes",
          "supportedAuthTypes",
          "supportedInterfaceTypes",
          "supportedInteractionModes",
          "docsUrl",
          "policyUrl"
        ],
        properties: {
          registryVersion: { type: "string" },
          schemaVersion: { type: "string" },
          publishedAppCount: { type: "number" },
          activeCapabilityCount: { type: "number" },
          supportedCapabilityTypes: { type: "array" },
          supportedAuthTypes: { type: "array" },
          supportedInterfaceTypes: { type: "array" },
          supportedInteractionModes: { type: "array" },
          docsUrl: { type: "string" },
          policyUrl: { type: "string" }
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
