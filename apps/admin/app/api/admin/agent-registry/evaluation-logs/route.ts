import { isAdminUser } from "@cotana/auth/authorization";
import { listAgentRegistryEvaluationLogs } from "@cotana/db";
import type { AgentAuthType, AgentInteractionMode, AgentInterfaceType, AgentRegistryReadinessBucket } from "@cotana/types";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../../../../lib/session";

function parseDate(value: string | null, endOfDay = false) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseInteger(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const logs = await listAgentRegistryEvaluationLogs({
    limit: Math.min(Math.max(parseInteger(request.nextUrl.searchParams.get("limit")) ?? 40, 1), 100),
    query: request.nextUrl.searchParams.get("query"),
    categorySlug: request.nextUrl.searchParams.get("category"),
    capabilityType: request.nextUrl.searchParams.get("capabilityType"),
    authType: request.nextUrl.searchParams.get("authType") as AgentAuthType | null,
    interfaceType: request.nextUrl.searchParams.get("interfaceType") as AgentInterfaceType | null,
    interactionMode: request.nextUrl.searchParams.get("interactionMode") as AgentInteractionMode | null,
    readinessBucket: request.nextUrl.searchParams.get("readinessBucket") as AgentRegistryReadinessBucket | null,
    matchedApp: request.nextUrl.searchParams.get("matchedApp"),
    minBlockingIssueCount: parseInteger(request.nextUrl.searchParams.get("minBlockingIssueCount")),
    maxBlockingIssueCount: parseInteger(request.nextUrl.searchParams.get("maxBlockingIssueCount")),
    from: parseDate(request.nextUrl.searchParams.get("from")),
    to: parseDate(request.nextUrl.searchParams.get("to"), true)
  });

  return NextResponse.json({ logs });
}
