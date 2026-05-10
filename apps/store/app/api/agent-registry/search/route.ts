import { analyticsEvents, trackServerEvent } from "@cotana/analytics";
import { recordAgentRegistryEvaluationLog } from "@cotana/db";
import { checkRateLimit } from "@cotana/db/redis";
import { searchAgentRegistryCapabilitiesWithEvaluation } from "@cotana/search";
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
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const category = request.nextUrl.searchParams.get("category");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 10);
  const actor = getRequestIdentity(request);
  const rateLimit = await checkRateLimit(`rate:agent-registry-search:${actor}`, 60, 60);

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Agent registry search rate limit exceeded." }, { status: 429 });
  }

  const filters = {
    authTypes: parseEnumList<AgentAuthType>(request.nextUrl.searchParams.get("auth"), authTypes),
    interfaceTypes: parseEnumList<AgentInterfaceType>(request.nextUrl.searchParams.get("interface"), interfaceTypes),
    interactionModes: parseEnumList<AgentInteractionMode>(
      request.nextUrl.searchParams.get("interaction"),
      interactionModes,
    )
  };
  const { results, evaluation } = await searchAgentRegistryCapabilitiesWithEvaluation(query, {
    categorySlug: category,
    limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 25) : 10,
    filters
  });
  void recordAgentRegistryEvaluationLog(evaluation).catch(() => undefined);

  void trackServerEvent({
    event: analyticsEvents.agentRegistrySearched,
    distinctId: actor,
    properties: {
      query,
      normalizedQuery: query.trim().toLowerCase(),
      category: category ?? "all",
      resultCount: results.length,
      candidateCount: evaluation.candidateCount,
      matchedCapabilityCount: evaluation.matchedCapabilityCount,
      blockingIssueCount: evaluation.blockingIssueCount,
      topQualityScore: evaluation.topMatch?.qualityScore ?? null,
      authTypes: filters.authTypes ?? [],
      interfaceTypes: filters.interfaceTypes ?? [],
      interactionModes: filters.interactionModes ?? []
    }
  });

  return NextResponse.json({
    version: "2026-05-07",
    purpose: "discovery",
    query: query.trim().toLowerCase(),
    filters,
    metadata: {
      resultCount: results.length,
      candidateCount: evaluation.candidateCount,
      matchedCapabilityCount: evaluation.matchedCapabilityCount,
      blockingIssueCount: evaluation.blockingIssueCount,
      category: category ?? "all",
      supportedFilters: {
        auth: authTypes,
        interface: interfaceTypes,
        interaction: interactionModes
      },
      noExecution: true,
      nextStep: "Inspect the returned app manifest and target app documentation before any external execution."
    },
    evaluation,
    trustBoundary: {
      cotanaRole: "DISCOVERY_ONLY",
      execution: "EXTERNAL_APP",
      credentialHandling: "NOT_HANDLED_BY_COTANA"
    },
    results
  });
}
