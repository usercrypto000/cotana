import { isAdminUser } from "@cotana/auth/authorization";
import { getAgentRegistryHealthExport } from "@cotana/db";
import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../../lib/session";

export async function GET() {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const health = await getAgentRegistryHealthExport();

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    purpose: "internal_registry_qa",
    noExecution: true,
    health
  });
}
