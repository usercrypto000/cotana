export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/services/prisma";
import {
  DEFAULT_MIN_SCORE,
  DEFAULT_MIN_USD,
  getStablecoinMap,
  normalizeTokenLabel,
  parseChainIds,
  parseCsv,
  parseToggle,
  parseWindow,
  shortAddress,
} from "@/services/smartMoneyLive";

const PAGE_LIMIT = 60;

type SwapRow = {
  chain_id: number;
  tx_hash: string;
  log_index: number;
  token_in: string;
  token_out: string;
  amount_in_dec: string;
  amount_out_dec: string;
  usd_value: string | null;
  dex: string;
  pool: string;
  trader: string;
  timestamp: number;
  score: number;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chainIds = parseChainIds(searchParams.get("chain"));
    const windowSeconds = parseWindow(searchParams.get("window"));
    const minScore = Number(searchParams.get("minScore") ?? DEFAULT_MIN_SCORE);
    const minUsd = Number(searchParams.get("minUsd") ?? DEFAULT_MIN_USD);
    const dexes = parseCsv(searchParams.get("dex"));
    const search = (searchParams.get("search") ?? "").toLowerCase().trim();
    const toggles = searchParams.get("toggles");

    const hideStable = parseToggle(toggles, "hideStable", true);
    const onlyNew = parseToggle(toggles, "onlyNew", false);
    const onlyVerified = parseToggle(toggles, "onlyVerified", false);

    const cursor = searchParams.get("cursor");
    const [cursorTs, cursorIdx] = cursor ? cursor.split(":") : [null, null];

    const now = Math.floor(Date.now() / 1000);
    const since = now - windowSeconds;

    const dexFilter = dexes.length
      ? Prisma.sql`AND s.dex IN (${Prisma.join(dexes)})`
      : Prisma.sql``;

    const cursorFilter = cursorTs
      ? Prisma.sql`AND (s.timestamp < ${Number(cursorTs)} OR (s.timestamp = ${
          Number(cursorTs)
        } AND s.log_index < ${Number(cursorIdx)}))`
      : Prisma.sql``;

    const swaps = await prisma.$queryRaw<SwapRow[]>(
      Prisma.sql`
        SELECT
          s.chain_id,
          s.tx_hash,
          s.log_index,
          s.token_in,
          s.token_out,
          s.amount_in_dec,
          s.amount_out_dec,
          s.usd_value,
          s.dex,
          s.pool,
          s.trader,
          s.timestamp,
          ws.score
        FROM swaps s
        INNER JOIN wallet_scores ws
          ON ws.chain_id = s.chain_id
          AND ws.wallet = s.trader
          AND ws.window = '30d'
          AND ws.score >= ${Number.isFinite(minScore) ? minScore : DEFAULT_MIN_SCORE}
        WHERE s.chain_id IN (${Prisma.join(chainIds)})
          AND s.priced = true
          AND s.usd_value >= ${Number.isFinite(minUsd) ? minUsd : DEFAULT_MIN_USD}
          AND s.timestamp >= ${since}
          ${dexFilter}
          ${cursorFilter}
        ORDER BY s.timestamp DESC, s.log_index DESC
        LIMIT ${PAGE_LIMIT}
      `
    );

    if (swaps.length === 0) {
      return NextResponse.json({ items: [], nextCursor: null });
    }

    const stablecoinMap = getStablecoinMap();
    const tokenAddresses = new Set<string>();
    const walletAddresses = new Set<string>();

    for (const swap of swaps) {
      tokenAddresses.add(`${swap.chain_id}:${swap.token_in}`);
      tokenAddresses.add(`${swap.chain_id}:${swap.token_out}`);
      walletAddresses.add(swap.trader);
    }

    const tokens = await prisma.token.findMany({
      where: {
        chainId: { in: chainIds },
        address: { in: Array.from(new Set([...tokenAddresses].map((key) => key.split(":")[1]))) },
      },
    });

    const tokenMap = new Map(tokens.map((token) => [`${token.chainId}:${token.address}`, token]));

    const labels = walletAddresses.size
      ? await prisma.$queryRaw<
          Array<{ chain_id: number; address: string; label: string; category: string; confidence: string }>
        >(
          Prisma.sql`
            SELECT al.chain_id, al.address, l.label, l.category, al.confidence
            FROM address_labels al
            INNER JOIN labels l ON l.id = al.label_id
            WHERE al.chain_id IN (${Prisma.join(chainIds)})
              AND al.address IN (${Prisma.join(Array.from(walletAddresses))})
          `
        )
      : [];

    const labelMap = new Map<string, { label: string; category: string; confidence: number }>();
    for (const row of labels) {
      const key = `${row.chain_id}:${row.address}`;
      const confidence = Number.parseFloat(row.confidence);
      const existing = labelMap.get(key);
      if (!existing || confidence > existing.confidence) {
        labelMap.set(key, { label: row.label, category: row.category, confidence });
      }
    }

    const items = swaps
      .map((swap) => {
        const usdValue = swap.usd_value ? Number.parseFloat(swap.usd_value) : 0;
        if (!Number.isFinite(usdValue) || usdValue <= 0) return null;

        const stablecoins = stablecoinMap.get(swap.chain_id) ?? new Set<string>();
        const tokenInStable = stablecoins.has(swap.token_in);
        const tokenOutStable = stablecoins.has(swap.token_out);
        if (hideStable && tokenInStable && tokenOutStable) return null;

        let side: "buy" | "sell";
        let token: string;
        if (tokenInStable && !tokenOutStable) {
          side = "buy";
          token = swap.token_out;
        } else if (tokenOutStable && !tokenInStable) {
          side = "sell";
          token = swap.token_in;
        } else {
          return null;
        }

        const tokenRow = tokenMap.get(`${swap.chain_id}:${token}`);
        if (onlyVerified && !tokenRow?.verified) return null;
        if (onlyNew && tokenRow?.firstSeenAt) {
          const ageSeconds = now - Math.floor(tokenRow.firstSeenAt.getTime() / 1000);
          if (ageSeconds > 86400) return null;
        }

        if (search) {
          const matchToken =
            token.toLowerCase().includes(search) ||
            normalizeTokenLabel(tokenRow?.symbol).toLowerCase().includes(search) ||
            normalizeTokenLabel(tokenRow?.name).toLowerCase().includes(search);
          const matchWallet = swap.trader.toLowerCase().includes(search);
          if (!matchToken && !matchWallet) return null;
        }

        const labelEntry = labelMap.get(`${swap.chain_id}:${swap.trader}`);
        const ageHours = tokenRow?.firstSeenAt
          ? Math.max(0, Math.floor((now - Math.floor(tokenRow.firstSeenAt.getTime() / 1000)) / 3600))
          : null;

        return {
          chainId: swap.chain_id,
          txHash: swap.tx_hash,
          logIndex: swap.log_index,
          side,
          usdValue,
          wallet: swap.trader,
          walletShort: shortAddress(swap.trader),
          score: swap.score,
          label: labelEntry ? labelEntry.label : null,
          token,
          tokenSymbol: normalizeTokenLabel(tokenRow?.symbol),
          tokenName: normalizeTokenLabel(tokenRow?.name),
          tokenAgeHours: ageHours,
          verified: tokenRow?.verified ?? false,
          route: `${swap.token_in} -> ${swap.token_out}`,
          dex: swap.dex,
          timestamp: swap.timestamp,
          amountIn: swap.amount_in_dec,
          amountOut: swap.amount_out_dec,
        };
      })
      .filter(Boolean);

    const last = swaps[swaps.length - 1];
    const nextCursor = last ? `${last.timestamp}:${last.log_index}` : null;

    return NextResponse.json({ items, nextCursor, groupByToken });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}
