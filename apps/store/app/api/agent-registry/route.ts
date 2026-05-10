import { getAgentRegistryStats, listAgentRegistryApps } from "@cotana/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");
  const [apps, stats] = await Promise.all([listAgentRegistryApps(category), getAgentRegistryStats()]);

  return NextResponse.json({
    version: "2026-05-07",
    purpose: "discovery",
    metadata: {
      category: category ?? "all",
      resultCount: apps.length,
      stats,
      endpoints: {
        discovery: "/.well-known/cotana-agent-registry",
        manifest: "/api/agent-registry/{slug}",
        capabilityManifest: "/api/agent-registry/{slug}/capabilities/{capabilitySlug}",
        search: "/api/agent-registry/search?q={intent}",
        compatibility: "/api/agent-registry/compatibility",
        policy: "/api/agent-registry/policy",
        schema: "/api/agent-registry/schema"
      }
    },
    trustBoundary: {
      cotanaRole: "DISCOVERY_ONLY",
      execution: "EXTERNAL_APP",
      credentialHandling: "NOT_HANDLED_BY_COTANA"
    },
    apps
  });
}
