import { isAdminUser } from "@cotana/auth/authorization";
import { validateRuntimeEnvironment } from "@cotana/config";
import { getLaunchHealth } from "@cotana/db";
import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/session";

export async function GET() {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [validation, health] = await Promise.all([Promise.resolve(validateRuntimeEnvironment()), getLaunchHealth("admin")]);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    purpose: "admin_environment_health",
    validation,
    health
  });
}
