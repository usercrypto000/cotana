import { buildRegistryVersionMetadata, cotanaRegistryContract } from "@cotana/config";
import { listAgentRegistryCategories } from "@cotana/db";
import { NextResponse } from "next/server";

export async function GET() {
  const categories = await listAgentRegistryCategories();

  return NextResponse.json({
    ...buildRegistryVersionMetadata(),
    version: cotanaRegistryContract.registryVersion,
    purpose: "discovery",
    categories
  });
}
