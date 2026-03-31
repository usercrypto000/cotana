import { listPublishedApps } from "@cotana/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category") ?? undefined;
  const apps = await listPublishedApps(category);

  return NextResponse.json({ apps });
}
