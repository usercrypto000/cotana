import { isAdminUser } from "@cotana/auth/authorization";
import { getAgentRegistryEvaluationLog } from "@cotana/db";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../../../../../lib/session";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const log = await getAgentRegistryEvaluationLog(id);

  if (!log) {
    return NextResponse.json({ error: "Evaluation log not found." }, { status: 404 });
  }

  return NextResponse.json({ log });
}
