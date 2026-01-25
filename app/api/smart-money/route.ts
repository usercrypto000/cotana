export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { listChains } from "@/services/chainConfig";

function parseChainIds(value: string | null): number[] {
  const chains = listChains();
  if (!value) return chains.map((chain) => chain.id);
  const ids = value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
  if (ids.length === 0) return chains.map((chain) => chain.id);
  return ids;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chainIds = parseChainIds(searchParams.get("chains"));
    const limit = clamp(Number(searchParams.get("limit") ?? 30), 1, 200);

    const [swaps, transfers] = await Promise.all([
      prisma.swap.findMany({
        where: { chainId: { in: chainIds } },
        orderBy: [{ timestamp: "desc" }, { logIndex: "desc" }],
        take: limit * 2,
      }),
      prisma.tokenTransfer.findMany({
        where: { chainId: { in: chainIds } },
        orderBy: [{ timestamp: "desc" }, { logIndex: "desc" }],
        take: limit * 2,
      }),
    ]);

    const tokenAddresses = new Set<string>();
    for (const swap of swaps) {
      tokenAddresses.add(swap.tokenIn);
      tokenAddresses.add(swap.tokenOut);
    }
    for (const transfer of transfers) {
      tokenAddresses.add(transfer.token);
    }

    const tokens = await prisma.token.findMany({
      where: {
        chainId: { in: chainIds },
        address: { in: Array.from(tokenAddresses) },
      },
    });

    const tokenMap = new Map(tokens.map((token) => [`${token.chainId}:${token.address}`, token]));
    const chainMap = new Map(listChains().map((chain) => [chain.id, chain.name]));

    const items = [
      ...swaps.map((swap) => {
        const tokenIn = tokenMap.get(`${swap.chainId}:${swap.tokenIn}`);
        const tokenOut = tokenMap.get(`${swap.chainId}:${swap.tokenOut}`);
        const symbolIn = tokenIn?.symbol ?? swap.tokenIn.slice(0, 6);
        const symbolOut = tokenOut?.symbol ?? swap.tokenOut.slice(0, 6);

        return {
          chainId: swap.chainId,
          chainName: chainMap.get(swap.chainId) ?? "Unknown",
          type: "erc20" as const,
          txHash: swap.txHash,
          blockNumber: Number(swap.blockNumber),
          timestamp: swap.timestamp,
          from: swap.trader,
          to: swap.pool,
          tokenSymbol: symbolOut,
          tokenAddress: swap.tokenOut,
          amount: swap.amountOutDec,
          valueUsd: swap.priced && swap.usdValue ? Number(swap.usdValue) : null,
          detail: `Swap ${swap.amountInDec} ${symbolIn} -> ${swap.amountOutDec} ${symbolOut}`,
        };
      }),
      ...transfers.map((transfer) => {
        const token = tokenMap.get(`${transfer.chainId}:${transfer.token}`);
        const symbol = token?.symbol ?? transfer.token.slice(0, 6);
        return {
          chainId: transfer.chainId,
          chainName: chainMap.get(transfer.chainId) ?? "Unknown",
          type: "erc20" as const,
          txHash: transfer.txHash,
          blockNumber: Number(transfer.blockNumber),
          timestamp: transfer.timestamp,
          from: transfer.from,
          to: transfer.to,
          tokenSymbol: symbol,
          tokenAddress: transfer.token,
          amount: transfer.amountDec,
          valueUsd: null,
          detail: `Transfer ${transfer.amountDec} ${symbol}`,
        };
      }),
    ]
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
      .slice(0, limit);

    return NextResponse.json({ items, updatedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}
