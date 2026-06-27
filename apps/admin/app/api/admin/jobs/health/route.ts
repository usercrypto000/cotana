import { isAdminUser } from "@cotana/auth/authorization";
import { getRuntimeEnvironment, validateRuntimeEnvironment } from "@cotana/config";
import { getLaunchHealth } from "@cotana/db";
import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../../lib/session";

export async function GET() {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const env = getRuntimeEnvironment();
  const validation = validateRuntimeEnvironment();
  const health = await getLaunchHealth("jobs");

  return NextResponse.json({
    ...health,
    purpose: "jobs_health",
    inngestConfigured: Boolean(env.INNGEST_EVENT_KEY && env.INNGEST_SIGNING_KEY),
    validationStatus: validation.status
  });
}
