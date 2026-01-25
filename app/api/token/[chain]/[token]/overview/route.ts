export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/services/prisma";
import { DEFAULT_MIN_SCORE, getStablecoinMap, normalizeTokenLabel } from "@/services/smartMoneyLive";

function normalizeAddress(value: string) {
  return value.trim().toLowerCase();
}

export async function GET(req: Request, context: { params: { chain: string; token: string } }) {
  try {
    const chainId = Number(context.params.chain);
    if (!Number.isFinite(chainId)) {
      return NextResponse.json({ error: "invalid chain" }, { status: 400 });
    }
    const token = normalizeAddress(context.params.token);

    const tokenRow = await prisma.token.findUnique({
      where: { chainId_address: { chainId, address: token } },
    });

    if (!tokenRow) {
      return NextResponse.json({ error: "token not found" }, { status: 404 });
    }

    const now = Math.floor(Date.now() / 1000);
    const since24h = now - 86400;

    const swaps = await prisma.$queryRaw<
      Array<{ token_in: string; token_out: string; usd_value: string | null; timestamp: number }>
    >(
      Prisma.sql`
        SELECT s.token_in, s.token_out, s.usd_value, s.timestamp
        FROM swaps s
        WHERE s.chain_id = ${chainId}
          AND s.priced = true
          AND s.timestamp >= ${since24h}
          AND (s.token_in = ${token} OR s.token_out = ${token})
      `
    );

    const stablecoins = getStablecoinMap().get(chainId) ?? new Set<string>();

    let volumeUsd = 0;
    for (const swap of swaps) {
      const usdValue = swap.usd_value ? Number.parseFloat(swap.usd_value) : 0;
      if (!Number.isFinite(usdValue) || usdValue <= 0) continue;
      volumeUsd += usdValue;
    }

    const smartSwaps = await prisma.$queryRaw<
      Array<{ token_in: string; token_out: string; usd_value: string | null }>
    >(
      Prisma.sql`
        SELECT s.token_in, s.token_out, s.usd_value
        FROM swaps s
        INNER JOIN wallet_scores ws
          ON ws.chain_id = s.chain_id
          AND ws.wallet = s.trader
          AND ws.window = '30d'
          AND ws.score >= ${DEFAULT_MIN_SCORE}
        WHERE s.chain_id = ${chainId}
          AND s.priced = true
          AND s.timestamp >= ${since24h}
          AND (s.token_in = ${token} OR s.token_out = ${token})
      `
    );

    let smartNetUsd = 0;
    for (const swap of smartSwaps) {
      const usdValue = swap.usd_value ? Number.parseFloat(swap.usd_value) : 0;
      if (!Number.isFinite(usdValue) || usdValue <= 0) continue;
      const tokenInStable = stablecoins.has(swap.token_in);
      const tokenOutStable = stablecoins.has(swap.token_out);
      if (tokenInStable && !tokenOutStable && swap.token_out === token) smartNetUsd += usdValue;
      if (tokenOutStable && !tokenInStable && swap.token_in === token) smartNetUsd -= usdValue;
    }

    const firstSeenAt = tokenRow.firstSeenAt ? tokenRow.firstSeenAt.toISOString() : null;
    const ageHours = tokenRow.firstSeenAt
      ? Math.max(0, Math.floor((now - Math.floor(tokenRow.firstSeenAt.getTime() / 1000)) / 3600))
      : null;

    return NextResponse.json({
      chainId,
      address: token,
      symbol: normalizeTokenLabel(tokenRow.symbol),
      name: normalizeTokenLabel(tokenRow.name),
      verified: tokenRow.verified,
      firstSeenAt,
      tokenAgeHours: ageHours,
      volume24hUsd: volumeUsd || null,
      liquidityUsd: null,
      smartNetFlowUsd24h: smartNetUsd,
    });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}