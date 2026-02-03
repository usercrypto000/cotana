import { NextRequest } from "next/server";
import { prisma } from "@/services/prisma";
import { isMindshareEnabled } from "@/services/mindshare";

function resolveWindow(window?: string | null) {
  if (window === "1d" || window === "7d" || window === "30d") return window;
  if (window === "24h") return "1d";
  return "7d";
}

// Next.js 16 proxy typing expects params to be a Promise when validated.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  if (!isMindshareEnabled()) {
    return new Response("Not found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const window = resolveWindow(searchParams.get("window"));
  const points = Math.min(Number(searchParams.get("points") ?? "24"), 200);

  const { slug } = await context.params;

  const protocol = await prisma.protocol.findUnique({ where: { slug } });
  if (!protocol) {
    return new Response("Not found", { status: 404 });
  }

  const rows = await prisma.protocolMetric.findMany({
    where: { protocolId: protocol.id, window },
    orderBy: { asOf: "desc" },
    take: points,
  });

  return Response.json({
    protocol: { id: protocol.slug, name: protocol.name, chainId: protocol.chainId },
    window,
    points: rows.length,
    data: rows
      .sort((a, b) => a.asOf.getTime() - b.asOf.getTime())
      .map((row) => ({
        asOf: row.asOf,
        uawDirect: row.uawDirect,
        uawEvent: row.uawEvent,
        uawAttributed: row.uawAttributed,
        eoaUaw: row.eoaUaw,
        swUaw: row.swUaw,
        repeatRate: Number(row.repeatRate),
        medianActionsPerWallet: Number(row.medianActionsPerWallet),
        valueMovedUsd: row.valueMovedUsd ? Number(row.valueMovedUsd) : null,
        score: row.score ? Number(row.score) : null,
      })),
  });
}
