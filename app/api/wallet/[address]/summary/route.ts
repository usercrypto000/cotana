export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { listChains } from "@/services/chainConfig";

function normalizeAddress(value: string) {
  return value.trim().toLowerCase();
}

export async function GET(req: Request, context: { params: { address: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const chainIdParam = searchParams.get("chain");
    const chainId = chainIdParam ? Number(chainIdParam) : null;
    const window = searchParams.get("window") ?? "30d";
    const address = normalizeAddress(context.params.address);

    const [positions, pnls, scores, labels] = await Promise.all([
      prisma.walletPosition.findMany({
        where: { wallet: address, ...(chainId ? { chainId } : {}) },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.walletTokenPnl.findMany({
        where: { wallet: address, ...(chainId ? { chainId } : {}) },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.walletScore.findMany({
        where: { wallet: address, window, ...(chainId ? { chainId } : {}) },
      }),
      prisma.addressLabel.findMany({
        where: { address, ...(chainId ? { chainId } : {}) },
      }),
    ]);

    const tokenAddresses = new Set<string>();
    positions.forEach((pos) => tokenAddresses.add(pos.token));
    pnls.forEach((pnl) => tokenAddresses.add(pnl.token));

    const [tokens, labelRows] = await Promise.all([
      prisma.token.findMany({
        where: {
          chainId: { in: Array.from(new Set([...positions, ...pnls].map((row) => row.chainId))) },
          address: { in: Array.from(tokenAddresses) },
        },
      }),
      labels.length
        ? prisma.label.findMany({ where: { id: { in: labels.map((label) => label.labelId) } } })
        : Promise.resolve([]),
    ]);

    const tokenMap = new Map(tokens.map((token) => [`${token.chainId}:${token.address}`, token]));
    const labelMap = new Map(labelRows.map((label) => [label.id, label]));
    const chainMap = new Map(listChains().map((chain) => [chain.id, chain.name]));

    return NextResponse.json({
      wallet: address,
      chainId: chainId ?? null,
      positions: positions.map((pos) => {
        const token = tokenMap.get(`${pos.chainId}:${pos.token}`);
        return {
          chainId: pos.chainId,
          chainName: chainMap.get(pos.chainId) ?? "Unknown",
          token: pos.token,
          symbol: token?.symbol ?? pos.token.slice(0, 6),
          balanceRaw: pos.balanceRaw.toString(),
          balanceDec: pos.balanceDec,
          updatedAt: pos.updatedAt,
        };
      }),
      pnl: pnls.map((pnl) => {
        const token = tokenMap.get(`${pnl.chainId}:${pnl.token}`);
        return {
          chainId: pnl.chainId,
          chainName: chainMap.get(pnl.chainId) ?? "Unknown",
          token: pnl.token,
          symbol: token?.symbol ?? pnl.token.slice(0, 6),
          realizedPnlUsd30d: pnl.realizedPnlUsd30d,
          realizedPnlUsdAll: pnl.realizedPnlUsdAll,
          winTrades30d: pnl.winTrades30d,
          lossTrades30d: pnl.lossTrades30d,
          avgHoldSeconds30d: pnl.avgHoldSeconds30d,
          updatedAt: pnl.updatedAt,
        };
      }),
      scores: scores.map((score) => ({
        chainId: score.chainId,
        chainName: chainMap.get(score.chainId) ?? "Unknown",
        score: score.score,
        window: score.window,
        features: score.featuresJson,
        updatedAt: score.updatedAt,
      })),
      labels: labels.map((label) => {
        const row = labelMap.get(label.labelId);
        return {
          chainId: label.chainId,
          address: label.address,
          labelId: label.labelId,
          label: row?.label ?? "unknown",
          category: row?.category ?? "unknown",
          confidence: label.confidence,
          source: label.source,
          updatedAt: label.updatedAt,
        };
      }),
    });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}