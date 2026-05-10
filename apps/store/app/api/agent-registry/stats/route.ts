import { getAgentRegistryStats } from "@cotana/db";
import { NextResponse } from "next/server";

export async function GET() {
  const stats = await getAgentRegistryStats();

  return NextResponse.json({
    version: "2026-05-07",
    purpose: "discovery",
    stats
  });
}
