import { buildRegistryVersionMetadata, cotanaRegistryContract } from "@cotana/config";
import { getAgentRegistryStats } from "@cotana/db";
import { NextResponse } from "next/server";

export async function GET() {
  const stats = await getAgentRegistryStats();

  return NextResponse.json({
    ...buildRegistryVersionMetadata(),
    version: cotanaRegistryContract.registryVersion,
    purpose: "discovery",
    stats
  });
}
