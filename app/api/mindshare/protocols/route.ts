import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/services/prisma";
import { isMindshareEnabled } from "@/services/mindshare";

function resolveWindow(window?: string | null) {
  if (window === "1d" || window === "7d" || window === "30d") return window;
  if (window === "24h") return "1d";
  return "7d";
}

function resolveSort(sort?: string | null) {
  if (sort === "uaw") return "uaw";
  if (sort === "score") return "score";
  return "score";
}

export async function GET(request: NextRequest) {
  if (!isMindshareEnabled()) {
    return new Response("Not found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const window = resolveWindow(searchParams.get("window"));
  const sort = resolveSort(searchParams.get("sort"));

  const rows = await prisma.$queryRaw<
    Array<{
      protocol_id: number;
      name: string;
      slug: string;
      chain_id: number;
      window: string;
      as_of: Date;
      uaw_attributed: number;
      uaw_direct: number;
      uaw_event: number;
      eoa_uaw: number;
      sw_uaw: number;
      repeat_rate: string;
      median_actions_per_wallet: string;
      value_moved_usd: string | null;
      score: string | null;
      prev_score: string | null;
      prev_uaw: number | null;
    }>
  >(
    Prisma.sql`
      SELECT *
      FROM (
        SELECT
          pm.protocol_id,
          p.name,
          p.slug,
          pm.chain_id,
          pm."window",
          pm.as_of,
          pm.uaw_attributed,
          pm.uaw_direct,
          pm.uaw_event,
          pm.eoa_uaw,
          pm.sw_uaw,
          pm.repeat_rate,
          pm.median_actions_per_wallet,
          pm.value_moved_usd,
          pm.score,
          LAG(pm.score) OVER (PARTITION BY pm.protocol_id ORDER BY pm.as_of DESC) AS prev_score,
          LAG(pm.uaw_attributed) OVER (PARTITION BY pm.protocol_id ORDER BY pm.as_of DESC) AS prev_uaw,
          ROW_NUMBER() OVER (PARTITION BY pm.protocol_id ORDER BY pm.as_of DESC) AS rn
        FROM protocol_metrics pm
        JOIN protocols p ON p.id = pm.protocol_id
        WHERE pm."window" = ${window}
      ) t
      WHERE rn = 1
    `
  );

  const sorted = [...rows].sort((a, b) => {
    if (sort === "uaw") return (b.uaw_attributed ?? 0) - (a.uaw_attributed ?? 0);
    return Number(b.score ?? 0) - Number(a.score ?? 0);
  });

  return Response.json({
    window,
    sort,
    data: sorted.map((row) => ({
      id: row.slug,
      name: row.name,
      chainId: row.chain_id,
      asOf: row.as_of,
      uawAttributed: row.uaw_attributed,
      uawDirect: row.uaw_direct,
      uawEvent: row.uaw_event,
      eoaUaw: row.eoa_uaw,
      swUaw: row.sw_uaw,
      repeatRate: Number(row.repeat_rate ?? 0),
      medianActionsPerWallet: Number(row.median_actions_per_wallet ?? 0),
      valueMovedUsd: row.value_moved_usd ? Number(row.value_moved_usd) : null,
      score: row.score ? Number(row.score) : null,
      prevScore: row.prev_score ? Number(row.prev_score) : null,
      prevUaw: row.prev_uaw ?? null,
    })),
  });
}
