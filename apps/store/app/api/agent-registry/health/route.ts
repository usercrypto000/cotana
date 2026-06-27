import { buildRegistryVersionMetadata } from "@cotana/config";
import { getLaunchHealth, getLaunchHealthHttpStatus } from "@cotana/db";
import { NextResponse } from "next/server";

export async function GET() {
  const health = await getLaunchHealth("registry");

  return NextResponse.json(
    {
      ...buildRegistryVersionMetadata(),
      ...health,
      purpose: "registry_health"
    },
    {
      status: getLaunchHealthHttpStatus(health.status)
    },
  );
}
