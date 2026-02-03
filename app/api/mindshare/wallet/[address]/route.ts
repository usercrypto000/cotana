import { NextRequest } from "next/server";
import { getWalletDetail, isMindshareEnabled, resolveMindshareWindow } from "@/services/mindshare";

type Params = { params: { address: string } | Promise<{ address: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  if (!isMindshareEnabled()) {
    return new Response("Not found", { status: 404 });
  }

  const resolved = await Promise.resolve(params);
  const { searchParams } = new URL(request.url);
  const window = resolveMindshareWindow(searchParams.get("window"));
  const detail = await getWalletDetail(resolved.address, window);

  if (!detail) {
    return new Response("Not found", { status: 404 });
  }

  return Response.json(detail);
}

