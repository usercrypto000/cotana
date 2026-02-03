import { NextRequest } from "next/server";
import { getMindshareSummary, isMindshareEnabled, resolveMindshareWindow } from "@/services/mindshare";

export async function GET(request: NextRequest) {
  if (!isMindshareEnabled()) {
    return new Response("Not found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const window = resolveMindshareWindow(searchParams.get("window"));
  const summary = await getMindshareSummary(window);

  return Response.json(summary);
}

