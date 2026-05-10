import { analyticsEvents, trackServerEvent } from "@cotana/analytics";
import { getAgentRegistryCompatibilityReport } from "@cotana/db";
import type { AgentAuthType, AgentInteractionMode, AgentInterfaceType } from "@cotana/types";
import { NextRequest, NextResponse } from "next/server";
import { getRequestIdentity } from "../../../../lib/request";

const authTypes = ["NONE", "API_KEY", "OAUTH2", "MCP", "CUSTOM"] as const;
const interfaceTypes = ["HTTP_API", "MCP_SERVER", "SDK", "WEBHOOK", "DATA_FEED", "DOCS_ONLY"] as const;
const interactionModes = ["READ_ONLY", "WRITE_ACTION", "TRANSACTIONAL", "HUMAN_HANDOFF"] as const;

function parseEnumList<T extends string>(value: string | null, allowed: readonly T[]) {
  if (!value) {
    return undefined;
  }

  const parsed = value
    .split(",")
    .map((entry) => entry.trim().toUpperCase())
    .filter((entry): entry is T => allowed.includes(entry as T));

  return parsed.length > 0 ? parsed : undefined;
}

export async function GET(request: NextRequest) {
  const actor = getRequestIdentity(request);
  const filters = {
    categorySlug: request.nextUrl.searchParams.get("category"),
    authTypes: parseEnumList<AgentAuthType>(request.nextUrl.searchParams.get("auth"), authTypes),
    interfaceTypes: parseEnumList<AgentInterfaceType>(request.nextUrl.searchParams.get("interface"), interfaceTypes),
    interactionModes: parseEnumList<AgentInteractionMode>(
      request.nextUrl.searchParams.get("interaction"),
      interactionModes,
    )
  };
  const report = await getAgentRegistryCompatibilityReport(filters);

  void trackServerEvent({
    event: analyticsEvents.agentRegistryCompatibilityViewed,
    distinctId: actor,
    properties: {
      category: filters.categorySlug ?? "all",
      authTypes: filters.authTypes ?? [],
      interfaceTypes: filters.interfaceTypes ?? [],
      interactionModes: filters.interactionModes ?? [],
      compatibleApps: report.compatible.appCount,
      compatibleCapabilities: report.compatible.capabilityCount
    }
  });

  return NextResponse.json({
    version: "2026-05-07",
    purpose: "discovery",
    report,
    trustBoundary: {
      cotanaRole: "DISCOVERY_ONLY",
      execution: "EXTERNAL_APP",
      credentialHandling: "NOT_HANDLED_BY_COTANA"
    }
  });
}
