import { isAdminUser } from "@cotana/auth/authorization";
import { NextResponse } from "next/server";
import { listSignalJobsWithStatus } from "../../../../../lib/jobs";
import { getSessionUser } from "../../../../../lib/session";

export async function GET() {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const jobs = await listSignalJobsWithStatus();
  return NextResponse.json({ jobs });
}
