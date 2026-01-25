export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/services/prisma";
import { getCachedJson, setCachedJson } from "@/services/cache";
import {
  DEFAULT_MIN_SCORE,
  DEFAULT_MIN_USD,
  bucketTime,
  getStablecoinMap,
  normalizeTokenLabel,
  parseBoolean,
  parseChainIds,
  parseCsv,
  parseToggle,
  parseWindow,
  shortAddress,
} from "@/services/smartMoneyLive";

const CACHE_TTL = 15;
const BUCKET_SECONDS = 180;

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

type ClusterSwap = {
  txHash: string;
  logIndex: number;
  wallet: string;
  walletShort: string;
  score: number;
  label: string | null;
  side: "buy" | "sell";
  usdValue: number;
  dex: string;
  tokenIn: string;
  tokenOut: string;
  timestamp: number;
};

type ClusterItem = {
  id: string;
  chainId: number;
  token: string;
  symbol: string;
  name: string;
  verified: boolean;
  tokenAgeHours: number | null;
  firstSeenAt: string | null;
  buyUsd: number;
  sellUsd: number;
  netUsd: number;
  walletCount: number;
  topWallets: Array<{ address: string; score: number; label: string | null }>;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  priceSpark: Array<number | null>;
  flowSpark: Array<number | null>;
  swaps: ClusterSwap[];
};

function computeSparkline(values: Array<{ timestamp: number; value: number }>, windowSeconds: number, bucketSeconds: number) {
  const buckets = Math.ceil(windowSeconds / bucketSeconds);
  const series = new Array(buckets).fill(null) as Array<number | null>;
  const counts = new Array(buckets).fill(0);
  const now = Math.floor(Date.now() / 1000);
  const start = now - windowSeconds;

  for (const point of values) {
    if (point.timestamp < start) continue;
    const index = Math.floor((point.timestamp - start) / bucketSeconds);
    if (index < 0 || index >= buckets) continue;
    series[index] = (series[index] ?? 0) + point.value;
    counts[index] += 1;
  }

  for (let i = 0; i < series.length; i += 1) {
    if (counts[i] === 0) {
      series[i] = null;
    } else if (series[i] !== null) {
      const value = series[i] ?? 0;
      series[i] = value / counts[i];
    }
  }

  return series;
}

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
    const groupByToken = parseBoolean(searchParams.get("groupByToken"), true);

    const cacheKey = `smart-money:clusters:${chainIds.join(".")}:${windowSeconds}:${minScore}:${minUsd}:${dexes.join(".")}:${hideStable}:${onlyNew}:${onlyVerified}:${groupByToken}:${search}`;
    const cached = await getCachedJson<{ items: ClusterItem[]; updatedAt: string }>(cacheKey);
    if (cached) return NextResponse.json(cached);

    const now = Math.floor(Date.now() / 1000);
    const since = now - windowSeconds;

    const dexFilter = dexes.length
      ? Prisma.sql`AND s.dex IN (${Prisma.join(dexes)})`
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
        ORDER BY s.timestamp DESC
        LIMIT 2000
      `
    );

    if (swaps.length === 0) {
      const result = { items: [], updatedAt: new Date().toISOString() };
      await setCachedJson(cacheKey, result, CACHE_TTL);
      return NextResponse.json(result);
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

    const clusters = new Map<
      string,
      {
        chainId: number;
        token: string;
        bucket: number;
        swaps: ClusterSwap[];
        buyUsd: number;
        sellUsd: number;
        wallets: Map<string, { score: number; label: string | null }>;
        pricePoints: Array<{ timestamp: number; value: number }>;
        flowPoints: Array<{ timestamp: number; value: number }>;
      }
    >();

    for (const swap of swaps) {
      const usdValue = swap.usd_value ? Number.parseFloat(swap.usd_value) : 0;
      if (!Number.isFinite(usdValue) || usdValue <= 0) continue;

      const stablecoins = stablecoinMap.get(swap.chain_id) ?? new Set<string>();
      const tokenInStable = stablecoins.has(swap.token_in);
      const tokenOutStable = stablecoins.has(swap.token_out);

      if (hideStable && tokenInStable && tokenOutStable) continue;

      let side: "buy" | "sell";
      let token: string;
      if (tokenInStable && !tokenOutStable) {
        side = "buy";
        token = swap.token_out;
      } else if (tokenOutStable && !tokenInStable) {
        side = "sell";
        token = swap.token_in;
      } else {
        continue;
      }

      const tokenRow = tokenMap.get(`${swap.chain_id}:${token}`);
      if (onlyVerified && !tokenRow?.verified) continue;
      if (onlyNew && tokenRow?.firstSeenAt) {
        const ageSeconds = now - Math.floor(tokenRow.firstSeenAt.getTime() / 1000);
        if (ageSeconds > 86400) continue;
      }

      if (search) {
        const matchToken =
          token.toLowerCase().includes(search) ||
          normalizeTokenLabel(tokenRow?.symbol).toLowerCase().includes(search) ||
          normalizeTokenLabel(tokenRow?.name).toLowerCase().includes(search);
        const matchWallet = swap.trader.toLowerCase().includes(search);
        if (!matchToken && !matchWallet) continue;
      }

      const bucket = bucketTime(swap.timestamp, BUCKET_SECONDS);
      const key = groupByToken
        ? `${swap.chain_id}:${token}:${bucket}:g`
        : `${swap.chain_id}:${swap.tx_hash}:${swap.log_index}:s`;
      const labelEntry = labelMap.get(`${swap.chain_id}:${swap.trader}`);

      const cluster = clusters.get(key) ?? {
        chainId: swap.chain_id,
        token,
        bucket: groupByToken ? bucket : swap.timestamp,
        swaps: [] as ClusterSwap[],
        buyUsd: 0,
        sellUsd: 0,
        wallets: new Map(),
        pricePoints: [] as Array<{ timestamp: number; value: number }>,
        flowPoints: [] as Array<{ timestamp: number; value: number }>,
      };

      cluster.swaps.push({
        txHash: swap.tx_hash,
        logIndex: swap.log_index,
        wallet: swap.trader,
        walletShort: shortAddress(swap.trader),
        score: swap.score,
        label: labelEntry ? labelEntry.label : null,
        side,
        usdValue,
        dex: swap.dex,
        tokenIn: swap.token_in,
        tokenOut: swap.token_out,
        timestamp: swap.timestamp,
      });

      if (side === "buy") {
        cluster.buyUsd += usdValue;
      } else {
        cluster.sellUsd += usdValue;
      }

      if (!cluster.wallets.has(swap.trader)) {
        cluster.wallets.set(swap.trader, { score: swap.score, label: labelEntry ? labelEntry.label : null });
      }

      const amount = side === "buy" ? Number.parseFloat(swap.amount_out_dec) : Number.parseFloat(swap.amount_in_dec);
      if (Number.isFinite(amount) && amount > 0) {
        cluster.pricePoints.push({ timestamp: swap.timestamp, value: usdValue / amount });
      }
      cluster.flowPoints.push({ timestamp: swap.timestamp, value: side === "buy" ? usdValue : -usdValue });

      clusters.set(key, cluster);
    }

    const items = Array.from(clusters.values()).map((cluster) => {
      const tokenRow = tokenMap.get(`${cluster.chainId}:${cluster.token}`);
      const symbol = normalizeTokenLabel(tokenRow?.symbol);
      const name = normalizeTokenLabel(tokenRow?.name);
      const firstSeenAt = tokenRow?.firstSeenAt ? tokenRow.firstSeenAt.toISOString() : null;
      const ageHours = tokenRow?.firstSeenAt
        ? Math.max(0, Math.floor((now - Math.floor(tokenRow.firstSeenAt.getTime() / 1000)) / 3600))
        : null;

      const wallets = Array.from(cluster.wallets.entries())
        .map(([address, data]) => ({ address, score: data.score, label: data.label }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      const priceSpark = computeSparkline(cluster.pricePoints, 3600, 300);
      const flowSpark = computeSparkline(cluster.flowPoints, 1800, 300);

      return {
        id: `${cluster.chainId}:${cluster.token}:${cluster.bucket}`,
        chainId: cluster.chainId,
        token: cluster.token,
        symbol,
        name,
        verified: tokenRow?.verified ?? false,
        tokenAgeHours: ageHours,
        firstSeenAt,
        buyUsd: cluster.buyUsd,
        sellUsd: cluster.sellUsd,
        netUsd: cluster.buyUsd - cluster.sellUsd,
        walletCount: cluster.wallets.size,
        topWallets: wallets,
        liquidityUsd: null,
        volume24hUsd: null,
        priceSpark,
        flowSpark,
        swaps: cluster.swaps.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20),
      };
    });

    const result = { items, updatedAt: new Date().toISOString() };
    await setCachedJson(cacheKey, result, CACHE_TTL);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}
