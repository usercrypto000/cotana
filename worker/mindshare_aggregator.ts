import pino from "pino";
import { prisma } from "../services/prisma";
import { ensureRedis, redis } from "../services/redisLite";

const logger = pino();

const CHAIN_ID = Number(process.env.MINDSHARE_CHAIN_ID ?? 1);

const WINDOWS: { name: string; hours: number }[] = [
  { name: "24h", hours: 24 },
  { name: "7d", hours: 24 * 7 },
];

async function aggregateWindow(windowName: string, hours: number) {
  logger.info({ window: windowName }, "aggregating window");
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  // Prefer Redis HLL counts for approximated uniques; fallback to DB exact counts.
  await ensureRedis();

  // Get list of addresses with any activity in window (for pagination this can be improved)
  const addrRows: Array<{ address: string; tx_count: number }> = await prisma.$queryRaw`
    SELECT address, COUNT(*) as tx_count
    FROM address_interactions
    WHERE chain_id = ${CHAIN_ID} AND block_time >= ${since}
    GROUP BY address
    ORDER BY tx_count DESC
  `;

  logger.info({ window: windowName, count: addrRows.length }, "rows aggregated");

  for (const r of addrRows) {
    const address = (r.address || "").toLowerCase();
    const tx_count = Number(r.tx_count ?? 0);
    let uaw = 0;
    try {
      const key = `mindshare:hll:${windowName}:${CHAIN_ID}:${address}`;
      uaw = await (redis as any).pfcount(key);
      // if HLL returned 0 but we have txs, fallback to exact DB distinct count
      if (uaw === 0 && tx_count > 0) {
        const res: any = await prisma.$queryRaw`
          SELECT COUNT(DISTINCT wallet) AS uaw FROM address_interactions WHERE chain_id = ${CHAIN_ID} AND address = ${address} AND block_time >= ${since}
        `;
        uaw = Number(res[0]?.uaw ?? 0);
      }
    } catch (e) {
      // fallback to exact DB count on error
      try {
        const res: any = await prisma.$queryRaw`
          SELECT COUNT(DISTINCT wallet) AS uaw FROM address_interactions WHERE chain_id = ${CHAIN_ID} AND address = ${address} AND block_time >= ${since}
        `;
        uaw = Number(res[0]?.uaw ?? 0);
      } catch (e2) {
        logger.warn({ err: e2, address }, "fallback distinct count failed");
        uaw = 0;
      }
    }

    try {
      await prisma.mindshareAddressStats.upsert({
        where: { window_chainId_address: { window: windowName, chainId: CHAIN_ID, address } as any } as any,
        create: { window: windowName, chainId: CHAIN_ID, address, uaw_est: uaw, tx_count },
        update: { uaw_est: uaw, tx_count },
      });
    } catch (e) {
      logger.error({ err: e, address, window: windowName }, "upsert failed");
    }
  }
}

async function main() {
  logger.info("starting mindshare aggregator");
  for (const w of WINDOWS) {
    await aggregateWindow(w.name, w.hours);
  }
  logger.info("aggregation complete");
  process.exit(0);
}

if (require.main === module) {
  main().catch((e) => {
    logger.error({ err: e }, "aggregator failed");
    process.exit(1);
  });
}

export { aggregateWindow };
