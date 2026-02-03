import { prisma } from "../services/prisma";
import pino from "pino";
import { computeRepeatRate, median } from "../services/metrics_helpers";
import { redis, ensureRedis, closeRedis } from "../services/redisLite";

const logger = pino();

const W1 = Number(process.env.MINDSHARE_SCORE_W1 ?? "1.0");
const W2 = Number(process.env.MINDSHARE_SCORE_W2 ?? "1.0");
const W3 = Number(process.env.MINDSHARE_SCORE_W3 ?? "1.0");
const W4 = Number(process.env.MINDSHARE_SCORE_W4 ?? "1.0");

function windowStart(now: Date, days: number) {
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (days - 1));
  return { start, end };
}

async function computeForProtocol(protocolId: number, chainId: number, days: number, asOf: Date) {
  const { start, end } = windowStart(asOf, days);
  const startDay = start.toISOString().slice(0, 10);
  const endDay = end.toISOString().slice(0, 10);

  const interactions = await prisma.rawInteraction.findMany({
    where: {
      protocolId,
      chainId,
      day: { gte: new Date(startDay), lte: new Date(endDay) },
    },
    select: { wallet: true, actionCount: true, walletType: true, day: true, source: true },
  });

  const wallets = new Map<
    string,
    { actions: number; days: Set<string>; walletType?: string; direct: boolean; event: boolean }
  >();
  for (const r of interactions) {
    const w =
      wallets.get(r.wallet) ?? { actions: 0, days: new Set<string>(), walletType: r.walletType, direct: false, event: false };
    w.actions += r.actionCount;
    w.days.add(r.day.toISOString().slice(0, 10));
    if ((r.source || "").toLowerCase() === "direct") w.direct = true;
    if ((r.source || "").toLowerCase() === "event") w.event = true;
    wallets.set(r.wallet, w);
  }

  const uawAttributed = wallets.size;
  let uawDirect = 0;
  let uawEvent = 0;

  let eoa = 0;
  let sw = 0;
  const actionsArr: number[] = [];
  for (const info of wallets.values()) {
    actionsArr.push(info.actions);
    if ((info.walletType || "EOA").toLowerCase() === "eoa") {
      eoa++;
    } else if ((info.walletType || "EOA").toLowerCase() === "contract" || (info.walletType || "EOA").toLowerCase() === "sw") {
      sw++;
    } else {
      eoa++;
    }
    if (info.direct) uawDirect++;
    if (info.event) uawEvent++;
  }

  const repeatRate = computeRepeatRate(Array.from(wallets.values()).map((w) => w.days.size));
  const medianActions = median(actionsArr);

  const valueMovedUsd = 0;
  const score =
    W1 * Math.log1p(uawAttributed) +
    W2 * repeatRate +
    W3 * Math.log1p(valueMovedUsd) +
    W4 * medianActions;

  const metric = await prisma.protocolMetric.create({
    data: {
      protocolId,
      chainId,
      window: `${days}d`,
      asOf,
      uawDirect,
      uawEvent,
      uawAttributed,
      eoaUaw: eoa,
      swUaw: sw,
      repeatRate: String(repeatRate),
      medianActionsPerWallet: String(medianActions),
      valueMovedUsd: String(valueMovedUsd),
      score: String(score),
    },
  });

  logger.info({ protocolId, days, insertedId: metric.id }, "wrote metric");
}

async function runHourly() {
  logger.info("starting metrics aggregator");
  await ensureRedis();
  const lock = await (redis as any).set("mindshare:metrics:lock", "1", "NX", "EX", 55 * 60);
  if (!lock) {
    logger.info("metrics job already running, skipping");
    return;
  }

  const protocols = await prisma.protocol.findMany();
  const asOf = new Date();
  for (const p of protocols) {
    try {
      await computeForProtocol(p.id, p.chainId, 1, asOf);
      await computeForProtocol(p.id, p.chainId, 7, asOf);
      await computeForProtocol(p.id, p.chainId, 30, asOf);
    } catch (e) {
      logger.error({ err: e, protocol: p.id }, "failed compute for protocol");
    }
  }
  await prisma.$disconnect();
  await closeRedis();
}

if (require.main === module) {
  runHourly().catch((e) => {
    logger.error({ err: e }, "metrics job failed");
    process.exit(1);
  });
}

export { runHourly };
