import { analyticsEvents, trackServerEvent } from "@cotana/analytics";
import { listAgentRegistryCapabilityTypes } from "@cotana/db";
import { NextResponse } from "next/server";
import { getRequestIdentity } from "../../../../lib/request";

export async function GET(request: Request) {
  const capabilityTypes = await listAgentRegistryCapabilityTypes();

  void trackServerEvent({
    event: analyticsEvents.agentRegistryCapabilitiesViewed,
    distinctId: getRequestIdentity(request),
    properties: {
      capabilityTypeCount: capabilityTypes.length
    }
  });

  return NextResponse.json({
    version: "2026-05-07",
    purpose: "discovery",
    capabilityTypes
  });
}
