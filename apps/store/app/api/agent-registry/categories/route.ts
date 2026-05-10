import { listAgentRegistryCategories } from "@cotana/db";
import { NextResponse } from "next/server";

export async function GET() {
  const categories = await listAgentRegistryCategories();

  return NextResponse.json({
    version: "2026-05-07",
    purpose: "discovery",
    categories
  });
}
