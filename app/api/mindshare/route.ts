import { NextRequest } from "next/server";
import { prisma } from "@/services/prisma";
import { computeBotScore } from "@/services/botFilter";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const window = url.searchParams.get("window") || "24h";
  const mode = url.searchParams.get("mode") || "raw";
  const limit = Number(url.searchParams.get("limit") || 100);

  const stats = await prisma.mindshareAddressStats.findMany({
    where: { window },
    orderBy: { uaw_est: "desc" },
    take: Math.min(limit, 500),
  });

  const addresses = stats.map((s) => s.address);
  const metas = await prisma.addressMetadata.findMany({ where: { address: { in: addresses } } });
  const metaMap = new Map(metas.map((m) => [m.address, m]));

  const threshold = Number(process.env.BOT_FILTER_THRESHOLD ?? 80);

  const out: any[] = [];
  for (const s of stats) {
    const metadata = metaMap.get(s.address) ?? null;
    if (mode === "filtered") {
      // compute filtered uaw by excluding wallets with bot_score >= threshold (using last 24h features)
      const since = new Date();
      if (s.window === "24h") since.setDate(since.getDate() - 1);
      else if (s.window === "7d") since.setDate(since.getDate() - 7);
      else since.setDate(since.getDate() - 1);

      const wallets = await prisma.addressInteraction.findMany({ where: { address: s.address, blockTime: { gte: since } }, distinct: ["wallet"], select: { wallet: true } });
      let filtered = 0;
      for (const w of wallets) {
        const score = await computeBotScore(1, w.wallet, s.window);
        if (score < threshold) filtered += 1;
      }
      out.push({ window: s.window, address: s.address, uaw_est: filtered, tx_count: s.tx_count, metadata });
    } else {
      out.push({ window: s.window, address: s.address, uaw_est: s.uaw_est, tx_count: s.tx_count, metadata });
    }
  }

  return new Response(JSON.stringify({ mode, window, results: out }), { status: 200, headers: { "Content-Type": "application/json" } });
}
