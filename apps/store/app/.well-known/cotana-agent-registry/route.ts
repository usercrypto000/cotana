import { analyticsEvents, trackServerEvent } from "@cotana/analytics";
import { NextResponse } from "next/server";
import { getRequestIdentity } from "../../../lib/request";

export async function GET(request: Request) {
  void trackServerEvent({
    event: analyticsEvents.agentRegistryDiscoveryViewed,
    distinctId: getRequestIdentity(request)
  });

  return NextResponse.json({
    name: "Cotana Agent Registry",
    version: "2026-05-07",
    purpose: "discovery",
    description:
      "Machine-readable discovery endpoints for AI agents looking for dapps with usable capabilities. Cotana does not execute downstream app actions or handle credentials.",
    endpoints: {
      registry: "/api/agent-registry",
      manifest: "/api/agent-registry/{slug}",
      capabilityManifest: "/api/agent-registry/{slug}/capabilities/{capabilitySlug}",
      search: "/api/agent-registry/search?q={intent}",
      schema: "/api/agent-registry/schema",
      categories: "/api/agent-registry/categories",
      capabilities: "/api/agent-registry/capabilities",
      compatibility: "/api/agent-registry/compatibility?auth={auth}&interface={interface}&interaction={interaction}",
      policy: "/api/agent-registry/policy",
      llms: "/llms.txt",
      stats: "/api/agent-registry/stats"
    },
    supportedFilters: {
      auth: ["NONE", "API_KEY", "OAUTH2", "MCP", "CUSTOM"],
      interface: ["HTTP_API", "MCP_SERVER", "SDK", "WEBHOOK", "DATA_FEED", "DOCS_ONLY"],
      interaction: ["READ_ONLY", "WRITE_ACTION", "TRANSACTIONAL", "HUMAN_HANDOFF"]
    },
    trustBoundary: {
      cotanaRole: "DISCOVERY_ONLY",
      execution: "EXTERNAL_APP",
      credentialHandling: "NOT_HANDLED_BY_COTANA"
    }
  });
}
