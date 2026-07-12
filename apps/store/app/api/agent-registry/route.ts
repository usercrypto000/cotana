import { buildRegistryVersionMetadata, cotanaRegistryContract } from "@cotana/config";
import { getAgentRegistryPublicReadinessMetadata, getAgentRegistryStats, listAgentRegistryApps } from "@cotana/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");
  const [apps, stats, readiness] = await Promise.all([
    listAgentRegistryApps(category),
    getAgentRegistryStats(),
    getAgentRegistryPublicReadinessMetadata()
  ]);

  return NextResponse.json({
    ...buildRegistryVersionMetadata(),
    version: cotanaRegistryContract.registryVersion,
    purpose: "discovery",
    metadata: {
      category: category ?? "all",
      resultCount: apps.length,
      stats,
      readiness,
      endpoints: cotanaRegistryContract.endpoints
    },
    trustBoundary: {
      cotanaRole: "DISCOVERY_ONLY",
      execution: "EXTERNAL_APP",
      credentialHandling: "NOT_HANDLED_BY_COTANA"
    },
    apps
  });
}
