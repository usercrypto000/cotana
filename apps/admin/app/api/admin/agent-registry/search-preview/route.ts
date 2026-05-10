import { isAdminUser } from "@cotana/auth/authorization";
import { searchAgentRegistryCapabilities } from "@cotana/search";
import type { AgentAuthType, AgentInteractionMode, AgentInterfaceType } from "@cotana/types";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../../../../lib/session";

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
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const query = request.nextUrl.searchParams.get("q") ?? "";
  const categorySlug = request.nextUrl.searchParams.get("category");
  const results = await searchAgentRegistryCapabilities(query, {
    categorySlug,
    limit: 8,
    filters: {
      authTypes: parseEnumList<AgentAuthType>(request.nextUrl.searchParams.get("auth"), authTypes),
      interfaceTypes: parseEnumList<AgentInterfaceType>(request.nextUrl.searchParams.get("interface"), interfaceTypes),
      interactionModes: parseEnumList<AgentInteractionMode>(
        request.nextUrl.searchParams.get("interaction"),
        interactionModes,
      )
    }
  });

  return NextResponse.json({
    query: query.trim().toLowerCase(),
    results
  });
}
