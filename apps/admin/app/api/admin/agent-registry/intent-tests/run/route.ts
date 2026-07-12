import { isAdminUser } from "@cotana/auth/authorization";
import { listAgentIntentTestCases, listAgentRedTeamTestCases } from "@cotana/db";
import { runAgentIntentTestSuite } from "@cotana/search";
import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../../../lib/session";

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const suite = url.searchParams.get("suite") === "red-team" ? "red-team" : "seeded";
  const testSetVersion = `${suite}-${new Date().toISOString()}`;
  const testCases = suite === "red-team" ? await listAgentRedTeamTestCases() : await listAgentIntentTestCases();
  const results = await runAgentIntentTestSuite(testCases, { testSetVersion });

  return NextResponse.json({
    testSetVersion,
    total: results.length,
    passed: results.filter((result) => result.passed).length,
    failed: results.filter((result) => !result.passed).length,
    results
  });
}
