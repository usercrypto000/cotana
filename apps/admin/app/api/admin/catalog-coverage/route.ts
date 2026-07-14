import { isAdminUser } from "@cotana/auth/authorization";

import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/session";

export async function GET() {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ error: "Not Found", message: "Catalog coverage audit is disabled" }, { status: 404 });
}
