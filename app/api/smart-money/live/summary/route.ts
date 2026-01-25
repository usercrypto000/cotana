export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/services/prisma";
import { getCachedJson, setCachedJson } from "@/services/cache";
import {
  DEFAULT_MIN_SCORE,
  getStablecoinMap,
  normalizeTokenLabel,
  parseChainIds,
  parseWindow,
} from "@/services/smartMoneyLive";

const CACHE_TTL = 15;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chainIds = parseChainIds(searchParams.get("chain"));
    const windowSeconds = parseWindow(searchParams.get("window"));
    const minScore = Number(searchParams.get("minScore") ?? DEFAULT_MIN_SCORE);

    const cacheKey = `smart-money:summary:${chainIds.join(".")}:${windowSeconds}:${minScore}`;
    const cached = await getCachedJson<{
      windowSeconds: number;
      smartBuysUsd: number;
      smartSellsUsd: number;
      netFlowUsd: number;
      activeWallets: number;
      topToken: null | { chainId: number; address: string; symbol: string; name: string; netUsd: number };
      updatedAt: string;
    }>(cacheKey);
    if (cached) return NextResponse.json(cached);

    const now = Math.floor(Date.now() / 1000);
    const sinceWindow = now - windowSeconds;
    const since15m = now - 900;

    const swaps = await prisma.$queryRaw<
      Array<{
        chain_id: number;
        token_in: string;
        token_out: string;
        usd_value: string | null;
        trader: string;
        timestamp: number;
      }>
    >(
      Prisma.sql`
        SELECT s.chain_id, s.token_in, s.token_out, s.usd_value, s.trader, s.timestamp
        FROM swaps s
        INNER JOIN wallet_scores ws
          ON ws.chain_id = s.chain_id
          AND ws.wallet = s.trader
          AND ws.window = '30d'
          AND ws.score >= ${Number.isFinite(minScore) ? minScore : DEFAULT_MIN_SCORE}
        WHERE s.chain_id IN (${Prisma.join(chainIds)})
          AND s.priced = true
          AND s.timestamp >= ${sinceWindow}
      `
    );

    const swaps15m = swaps.filter((swap) => swap.timestamp >= since15m);

    const stablecoinMap = getStablecoinMap();

    let buyUsd = 0;
    let sellUsd = 0;
    const activeWallets = new Set<string>();
    const netByToken = new Map<string, number>();

    for (const swap of swaps) {
      const usdValue = swap.usd_value ? Number.parseFloat(swap.usd_value) : 0;
      if (!Number.isFinite(usdValue) || usdValue <= 0) continue;
      const stablecoins = stablecoinMap.get(swap.chain_id) ?? new Set<string>();
      const tokenInStable = stablecoins.has(swap.token_in);
      const tokenOutStable = stablecoins.has(swap.token_out);

      if (tokenInStable && !tokenOutStable) buyUsd += usdValue;
      if (tokenOutStable && !tokenInStable) sellUsd += usdValue;
    }

    for (const swap of swaps15m) {
      activeWallets.add(swap.trader);
      const usdValue = swap.usd_value ? Number.parseFloat(swap.usd_value) : 0;
      if (!Number.isFinite(usdValue) || usdValue <= 0) continue;

      const stablecoins = stablecoinMap.get(swap.chain_id) ?? new Set<string>();
      const tokenInStable = stablecoins.has(swap.token_in);
      const tokenOutStable = stablecoins.has(swap.token_out);

      if (tokenInStable && !tokenOutStable) {
        const key = `${swap.chain_id}:${swap.token_out}`;
        netByToken.set(key, (netByToken.get(key) ?? 0) + usdValue);
      }
      if (tokenOutStable && !tokenInStable) {
        const key = `${swap.chain_id}:${swap.token_in}`;
        netByToken.set(key, (netByToken.get(key) ?? 0) - usdValue);
      }
    }

    let topTokenKey: string | null = null;
    let topTokenNet = 0;
    for (const [key, value] of netByToken.entries()) {
      if (value > topTokenNet) {
        topTokenNet = value;
        topTokenKey = key;
      }
    }

    let topToken = null as null | {
      chainId: number;
      address: string;
      symbol: string;
      name: string;
      netUsd: number;
    };

    if (topTokenKey) {
      const [chainIdStr, address] = topTokenKey.split(":");
      const chainId = Number(chainIdStr);
      const tokenRow = await prisma.token.findUnique({
        where: { chainId_address: { chainId, address } },
      });
      topToken = {
        chainId,
        address,
        symbol: normalizeTokenLabel(tokenRow?.symbol),
        name: normalizeTokenLabel(tokenRow?.name),
        netUsd: topTokenNet,
      };
    }

    const result = {
      windowSeconds,
      smartBuysUsd: buyUsd,
      smartSellsUsd: sellUsd,
      netFlowUsd: buyUsd - sellUsd,
      activeWallets: activeWallets.size,
      topToken,
      updatedAt: new Date().toISOString(),
    };

    await setCachedJson(cacheKey, result, CACHE_TTL);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}
