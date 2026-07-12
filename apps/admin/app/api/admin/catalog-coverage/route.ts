import { isAdminUser } from "@cotana/auth/authorization";
import { getCatalogCoverageAudit } from "@cotana/db";
import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/session";

export async function GET() {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const audit = await getCatalogCoverageAudit();

  return NextResponse.json({
    generatedAt: audit.generatedAt.toISOString(),
    purpose: "internal_catalog_qa",
    noExecution: true,
    audit
  });
}
