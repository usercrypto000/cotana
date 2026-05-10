import { isAdminUser } from "@cotana/auth/authorization";
import { getAgentRegistryQualitySummary, listAgentRegistryQualityRows } from "@cotana/db";
import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../../lib/session";

export async function GET() {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [rows, summary] = await Promise.all([listAgentRegistryQualityRows(), getAgentRegistryQualitySummary()]);
  return NextResponse.json({ rows, summary });
}
