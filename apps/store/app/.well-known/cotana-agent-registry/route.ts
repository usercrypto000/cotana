import { analyticsEvents, trackServerEvent } from "@cotana/analytics";
import { buildRegistryVersionMetadata, cotanaRegistryContract } from "@cotana/config";
import { getAgentRegistryPublicReadinessMetadata } from "@cotana/db";
import { NextResponse } from "next/server";
import { getRequestIdentity } from "../../../lib/request";

export async function GET(request: Request) {
  void trackServerEvent({
    event: analyticsEvents.agentRegistryDiscoveryViewed,
    distinctId: getRequestIdentity(request)
  });

  const readiness = await getAgentRegistryPublicReadinessMetadata();

  return NextResponse.json({
    ...buildRegistryVersionMetadata(),
    name: "Cotana Agent Registry",
    version: cotanaRegistryContract.registryVersion,
    purpose: "discovery",
    description:
      "Machine-readable discovery endpoints for AI agents looking for dapps with usable capabilities. Cotana does not execute downstream app actions or handle credentials.",
    readiness,
    endpoints: cotanaRegistryContract.endpoints,
    supportedFilters: cotanaRegistryContract.supportedFilters,
    trustBoundary: {
      cotanaRole: "DISCOVERY_ONLY",
      execution: "EXTERNAL_APP",
      credentialHandling: "NOT_HANDLED_BY_COTANA"
    }
  });
}
