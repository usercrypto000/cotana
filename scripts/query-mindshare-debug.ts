import { prisma } from "../services/prisma";

async function run(windowName: string, mode: "raw" | "filtered", limit = 20) {
  const stats = await prisma.mindshareAddressStats.findMany({ where: { window: windowName }, orderBy: { uaw_est: "desc" }, take: limit });
  const out: any[] = [];

  // identify bot wallets (simple heuristic): wallets with >100 interactions in window
  const since = new Date();
  if (windowName === "24h") since.setDate(since.getDate() - 1);
  else if (windowName === "7d") since.setDate(since.getDate() - 7);

  const botRows: Array<{ wallet: string }> = await prisma.$queryRaw`
    SELECT wallet FROM address_interactions WHERE chain_id = 1 AND block_time >= ${since} GROUP BY wallet HAVING COUNT(*) > 100
  `;
  const botSet = new Set(botRows.map((b) => b.wallet));

  for (const s of stats) {
    const meta = await prisma.addressMetadata.findUnique({ where: { chainId_address: { chainId: s.chainId, address: s.address } as any } as any }).catch(() => null);
    if (mode === "filtered") {
      const wallets = await prisma.addressInteraction.findMany({ where: { address: s.address, blockTime: { gte: since } }, distinct: ["wallet"], select: { wallet: true } });
      const filtered = wallets.filter((w) => !botSet.has(w.wallet)).length;
      out.push({ address: s.address, uaw_est: s.uaw_est, tx_count: s.tx_count, filtered_uaw: filtered, metadata: meta });
    } else {
      out.push({ address: s.address, uaw_est: s.uaw_est, tx_count: s.tx_count, metadata: meta });
    }
  }
  console.log(JSON.stringify({ mode, window: windowName, results: out }, null, 2));
}

async function main() {
  console.log("RAW 24h:");
  await run("24h", "raw", 20);
  console.log("FILTERED 24h:");
  await run("24h", "filtered", 20);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
