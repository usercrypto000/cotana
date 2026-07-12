"use server";

import { isAdminUser } from "@cotana/auth";
import { listAgentIntentTestCases, listAgentRedTeamTestCases } from "@cotana/db";
import { runAgentIntentTestSuite } from "@cotana/search";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "../../lib/session";

export async function runSeededAgentIntentTestsAction() {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return;
  }

  const testSetVersion = `seeded-${new Date().toISOString()}`;
  const testCases = await listAgentIntentTestCases();
  await runAgentIntentTestSuite(testCases, { testSetVersion });
  revalidatePath("/registry-quality");
}

export async function runRedTeamAgentIntentTestsAction() {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return;
  }

  const testSetVersion = `red-team-${new Date().toISOString()}`;
  const testCases = await listAgentRedTeamTestCases();
  await runAgentIntentTestSuite(testCases, { testSetVersion });
  revalidatePath("/registry-quality");
}
