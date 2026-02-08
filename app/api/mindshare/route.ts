import { NextRequest } from "next/server";
import { prisma } from "@/services/prisma";
import { computeBotScore } from "@/services/botFilter";

type MindshareRow = {
  window: string;
  address: string;
  uaw_est: number;
  tx_count: number;
  filtered_uaw?: number;
  metadata?: any | null;
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const windowParam = url.searchParams.get("window") || "24h";
  const mode = url.searchParams.get("mode") || "raw";
  const limit = Math.min(Number(url.searchParams.get("limit") || 100), 500);
  const cursor = url.searchParams.get("cursor") || null;

  // Base query: window filter and suppression exclusion
  const whereBase: any = { window: windowParam };

  // Exclude suppressed addresses
  const suppressed = await prisma.addressSuppression.findMany({ where: { chainId: 1 } }).catch(() => []);
  const suppressedSet = new Set(suppressed.map((s: any) => s.address));

  // Cursor pagination: use id cursor
  const take = limit + 1; // fetch one extra to know if there is a next cursor
  const stats = await prisma.mindshareAddressStats.findMany({
    where: whereBase,
    orderBy: [{ uaw_est: "desc" }, { id: "desc" }],
    cursor: cursor ? { id: Number(cursor) } : undefined,
    skip: cursor ? 1 : 0,
    take,
  });

  const rows: MindshareRow[] = [];
  const addresses = stats.map((s) => s.address);
  const metas = await prisma.addressMetadata.findMany({ where: { address: { in: addresses } } });
  const metaMap = new Map(metas.map((m) => [m.address, m]));

  const threshold = Number(process.env.BOT_FILTER_THRESHOLD ?? 80);

  for (const s of stats.slice(0, limit)) {
    if (suppressedSet.has(s.address)) continue; // API-level suppression
    const metadata = metaMap.get(s.address) ?? null;
    if (mode === "filtered") {
      const scoreWindow = s.window;
      const since = new Date();
      if (scoreWindow === "24h") since.setDate(since.getDate() - 1);
      else if (scoreWindow === "7d") since.setDate(since.getDate() - 7);

      const wallets = await prisma.addressInteraction.findMany({ where: { address: s.address, blockTime: { gte: since } }, distinct: ["wallet"], select: { wallet: true } });
      let filtered = 0;
      for (const w of wallets) {
        const score = await computeBotScore(1, w.wallet, scoreWindow);
        if (score < threshold) filtered += 1;
      }
      rows.push({ window: s.window, address: s.address, uaw_est: filtered, tx_count: s.tx_count, metadata });
    } else {
      rows.push({ window: s.window, address: s.address, uaw_est: s.uaw_est, tx_count: s.tx_count, metadata });
    }
  }

  // determine nextCursor
  let nextCursor: string | null = null;
  if (stats.length > limit) {
    const last = stats[limit];
    nextCursor = String(last.id);
  }

  // caching headers per window
  const cacheSeconds = windowParam === "7d" ? 300 : 60;

  const body = { mode, window: windowParam, results: rows, nextCursor };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`,
    },
  });
}
