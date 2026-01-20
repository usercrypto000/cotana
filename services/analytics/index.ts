import { Prisma } from "@prisma/client";
import { formatUnits } from "viem";
import { prisma } from "@/services/prisma";
import { listChains } from "@/services/chainConfig";

const SCORE_WEIGHTS = {
  pnl: 0.3,
  winRate: 0.3,
  profitableTokens: 0.2,
  consistency: 0.1,
  avoidRug: 0.1,
};

const PROFITABLE_TOKEN_TARGET = 10;
const CONSISTENCY_TOKEN_TARGET = 3;
const AVOID_RUG_DAYS = 7;

function getChain(chainId: number) {
  const chain = listChains().find((item) => item.id === chainId);
  if (!chain) throw new Error(`Unknown chain ${chainId}`);
  return chain;
}

export async function updateWalletPositions(chainId: number, fromBlock: bigint, toBlock: bigint) {
  const transfers = await prisma.tokenTransfer.findMany({
    where: { chainId, blockNumber: { gte: fromBlock, lte: toBlock } },
  });
  if (transfers.length === 0) return;

  const deltas = new Map<string, bigint>();
  const tokens = new Set<string>();
  const wallets = new Set<string>();

  for (const transfer of transfers) {
    const fromKey = `${transfer.from}:${transfer.token}`;
    const toKey = `${transfer.to}:${transfer.token}`;
    deltas.set(fromKey, (deltas.get(fromKey) ?? 0n) - transfer.amountRaw);
    deltas.set(toKey, (deltas.get(toKey) ?? 0n) + transfer.amountRaw);
    tokens.add(transfer.token);
    wallets.add(transfer.from);
    wallets.add(transfer.to);
  }

  const tokenRows = await prisma.token.findMany({
    where: { chainId, address: { in: Array.from(tokens) } },
  });
  const tokenMap = new Map(tokenRows.map((token) => [token.address, token]));

  const existing = await prisma.walletPosition.findMany({
    where: {
      chainId,
      wallet: { in: Array.from(wallets) },
      token: { in: Array.from(tokens) },
    },
  });
  const existingMap = new Map(existing.map((row) => [`${row.wallet}:${row.token}`, row]));

  for (const [key, delta] of deltas.entries()) {
    if (delta === 0n) continue;
    const [wallet, token] = key.split(":");
    const current = existingMap.get(key);
    const nextRaw = (current?.balanceRaw ?? 0n) + delta;
    const decimals = tokenMap.get(token)?.decimals ?? 18;
    const nextDec = formatUnits(nextRaw, decimals);

    await prisma.walletPosition.upsert({
      where: { chainId_wallet_token: { chainId, wallet, token } },
      update: { balanceRaw: nextRaw, balanceDec: nextDec },
      create: { chainId, wallet, token, balanceRaw: nextRaw, balanceDec: nextDec },
    });
  }
}

type Lot = {
  amountRaw: bigint;
  costUsd: number;
  timestamp: number;
};

type PnlStats = {
  realizedPnlUsd: number;
  winTrades: number;
  lossTrades: number;
  holdSecondsSum: number;
  holdCount: number;
};

function computePnlStats(swaps: Array<{
  trader: string | null;
  tokenIn: string;
  tokenOut: string;
  amountInRaw: bigint;
  amountOutRaw: bigint;
  amountInDec: string;
  amountOutDec: string;
  timestamp: number;
}>, stablecoins: Set<string>) {
  const lots = new Map<string, Lot[]>();
  const stats = new Map<string, PnlStats>();

  for (const swap of swaps) {
    if (!swap.trader) continue;
    const tokenInStable = stablecoins.has(swap.tokenIn);
    const tokenOutStable = stablecoins.has(swap.tokenOut);

    if (tokenInStable && !tokenOutStable) {
      const costUsd = Number.parseFloat(swap.amountInDec);
      if (!Number.isFinite(costUsd) || costUsd <= 0) continue;
      const key = `${swap.trader}:${swap.tokenOut}`;
      const list = lots.get(key) ?? [];
      list.push({ amountRaw: swap.amountOutRaw, costUsd, timestamp: swap.timestamp });
      lots.set(key, list);
      continue;
    }

    if (tokenOutStable && !tokenInStable) {
      const proceedsUsd = Number.parseFloat(swap.amountOutDec);
      const soldAmountDec = Number.parseFloat(swap.amountInDec);
      if (!Number.isFinite(proceedsUsd) || !Number.isFinite(soldAmountDec) || soldAmountDec <= 0) {
        continue;
      }

      const key = `${swap.trader}:${swap.tokenIn}`;
      const list = lots.get(key) ?? [];
      if (list.length === 0) continue;

      let remaining = swap.amountInRaw;
      let realized = 0;
      let holdSecondsSum = 0;
      let holdCount = 0;

      while (remaining > 0n && list.length > 0) {
        const lot = list[0];
        const take = remaining < lot.amountRaw ? remaining : lot.amountRaw;
        const takeRatio = Number(take) / Number(lot.amountRaw);
        const proceedsRatio = Number(take) / Number(swap.amountInRaw);

        const costPortion = lot.costUsd * takeRatio;
        const proceedsPortion = proceedsUsd * proceedsRatio;
        realized += proceedsPortion - costPortion;
        holdSecondsSum += (swap.timestamp - lot.timestamp) * takeRatio;
        holdCount += takeRatio;

        remaining -= take;
        lot.amountRaw -= take;
        if (lot.amountRaw === 0n) list.shift();
      }

      const stat = stats.get(key) ?? {
        realizedPnlUsd: 0,
        winTrades: 0,
        lossTrades: 0,
        holdSecondsSum: 0,
        holdCount: 0,
      };
      stat.realizedPnlUsd += realized;
      if (realized >= 0) stat.winTrades += 1;
      if (realized < 0) stat.lossTrades += 1;
      stat.holdSecondsSum += holdSecondsSum;
      stat.holdCount += holdCount;
      stats.set(key, stat);
    }
  }

  return stats;
}

export async function updateWalletPnL(chainId: number) {
  const chain = getChain(chainId);
  const stablecoins = new Set(chain.stablecoins.map((token) => token.toLowerCase()));

  const swapsAll = await prisma.swap.findMany({
    where: {
      chainId,
      OR: [{ tokenIn: { in: Array.from(stablecoins) } }, { tokenOut: { in: Array.from(stablecoins) } }],
    },
    orderBy: { timestamp: "asc" },
  });

  const since = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
  const swaps30d = swapsAll.filter((swap) => swap.timestamp >= since);

  const allStats = computePnlStats(swapsAll, stablecoins);
  const stats30d = computePnlStats(swaps30d, stablecoins);

  const keys = new Set<string>([...allStats.keys(), ...stats30d.keys()]);

  for (const key of keys) {
    const [wallet, token] = key.split(":");
    const all = allStats.get(key) ?? {
      realizedPnlUsd: 0,
      winTrades: 0,
      lossTrades: 0,
      holdSecondsSum: 0,
      holdCount: 0,
    };
    const recent = stats30d.get(key) ?? {
      realizedPnlUsd: 0,
      winTrades: 0,
      lossTrades: 0,
      holdSecondsSum: 0,
      holdCount: 0,
    };

    const avgHold = recent.holdCount > 0 ? Math.round(recent.holdSecondsSum / recent.holdCount) : 0;

    await prisma.walletTokenPnl.upsert({
      where: { chainId_wallet_token: { chainId, wallet, token } },
      update: {
        realizedPnlUsd30d: new Prisma.Decimal(recent.realizedPnlUsd.toFixed(4)),
        realizedPnlUsdAll: new Prisma.Decimal(all.realizedPnlUsd.toFixed(4)),
        winTrades30d: recent.winTrades,
        lossTrades30d: recent.lossTrades,
        avgHoldSeconds30d: avgHold,
      },
      create: {
        chainId,
        wallet,
        token,
        realizedPnlUsd30d: new Prisma.Decimal(recent.realizedPnlUsd.toFixed(4)),
        realizedPnlUsdAll: new Prisma.Decimal(all.realizedPnlUsd.toFixed(4)),
        winTrades30d: recent.winTrades,
        lossTrades30d: recent.lossTrades,
        avgHoldSeconds30d: avgHold,
      },
    });
  }
}

export async function updateWalletScores(chainId: number) {
  const pnls = await prisma.walletTokenPnl.findMany({ where: { chainId } });
  if (pnls.length === 0) return;

  const walletMap = new Map<
    string,
    {
      pnlUsd: number;
      winTrades: number;
      lossTrades: number;
      profitableTokens: number;
      tokens: Set<string>;
    }
  >();

  for (const pnl of pnls) {
    const entry = walletMap.get(pnl.wallet) ?? {
      pnlUsd: 0,
      winTrades: 0,
      lossTrades: 0,
      profitableTokens: 0,
      tokens: new Set<string>(),
    };
    const pnlUsd = Number(pnl.realizedPnlUsd30d);
    entry.pnlUsd += pnlUsd;
    entry.winTrades += pnl.winTrades30d;
    entry.lossTrades += pnl.lossTrades30d;
    if (pnlUsd > 0) entry.profitableTokens += 1;
    entry.tokens.add(pnl.token);
    walletMap.set(pnl.wallet, entry);
  }

  const allTokens = new Set<string>();
  pnls.forEach((pnl) => allTokens.add(pnl.token));
  const tokenRows = await prisma.tokenTransfer.groupBy({
    by: ["token"],
    where: { chainId, token: { in: Array.from(allTokens) } },
    _min: { timestamp: true },
  });
  const tokenAgeMap = new Map(tokenRows.map((row) => [row.token, row._min.timestamp ?? 0]));
  const now = Math.floor(Date.now() / 1000);

  for (const [wallet, stats] of walletMap.entries()) {
    const totalTrades = stats.winTrades + stats.lossTrades;
    const winRate = totalTrades > 0 ? stats.winTrades / totalTrades : 0;
    const pnlScore = Math.min(1, Math.log10(1 + Math.max(0, stats.pnlUsd)) / 5);
    const profitableScore = Math.min(1, stats.profitableTokens / PROFITABLE_TOKEN_TARGET);
    const consistencyScore = stats.profitableTokens >= CONSISTENCY_TOKEN_TARGET ? 1 : 0;

    let avoidRugScore = 0;
    if (stats.tokens.size > 0) {
      let safe = 0;
      for (const token of stats.tokens) {
        const firstSeen = tokenAgeMap.get(token) ?? 0;
        const ageDays = firstSeen ? (now - firstSeen) / (24 * 60 * 60) : 0;
        if (ageDays >= AVOID_RUG_DAYS) safe += 1;
      }
      avoidRugScore = safe / stats.tokens.size;
    }

    const weightedScore =
      SCORE_WEIGHTS.pnl * pnlScore +
      SCORE_WEIGHTS.winRate * winRate +
      SCORE_WEIGHTS.profitableTokens * profitableScore +
      SCORE_WEIGHTS.consistency * consistencyScore +
      SCORE_WEIGHTS.avoidRug * avoidRugScore;

    const finalScore = Math.round(weightedScore * 100);

    const features = {
      pnlUsd30d: stats.pnlUsd,
      winRate,
      profitableTokens: stats.profitableTokens,
      consistency: consistencyScore,
      avoidRug: avoidRugScore,
    };

    await prisma.walletScore.upsert({
      where: { chainId_wallet_window: { chainId, wallet, window: "30d" } },
      update: { score: finalScore, featuresJson: features },
      create: { chainId, wallet, window: "30d", score: finalScore, featuresJson: features },
    });
  }
}