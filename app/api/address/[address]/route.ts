import { NextRequest } from "next/server";
import { prisma } from "@/services/prisma";

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const parts = u.pathname.split("/").filter(Boolean);
  const address = parts[parts.length - 1]?.toLowerCase();
  if (!address) return new Response("missing address", { status: 400 });

  const meta = await prisma.addressMetadata.findUnique({ where: { chainId_address: { chainId: 1, address } as any } as any }).catch(() => null);

  const stats24 = await prisma.mindshareAddressStats.findUnique({ where: { window_chainId_address: { window: "24h", chainId: 1, address } as any } as any }).catch(() => null);
  const stats7 = await prisma.mindshareAddressStats.findUnique({ where: { window_chainId_address: { window: "7d", chainId: 1, address } as any } as any }).catch(() => null);

  return new Response(
    JSON.stringify({ address, metadata: meta, stats: { "24h": stats24, "7d": stats7 } }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
