export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { listChains } from "@/services/chainConfig";

function normalizeAddress(value: string) {
  return value.trim().toLowerCase();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export async function GET(req: Request, context: { params: { address: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const chainIdParam = searchParams.get("chain");
    const chainId = chainIdParam ? Number(chainIdParam) : null;
    const limit = clamp(Number(searchParams.get("limit") ?? 50), 1, 200);
    const page = clamp(Number(searchParams.get("page") ?? 0), 0, 1000);
    const address = normalizeAddress(context.params.address);

    const swaps = await prisma.swap.findMany({
      where: {
        trader: address,
        ...(chainId ? { chainId } : {}),
      },
      orderBy: [{ timestamp: "desc" }, { logIndex: "desc" }],
      skip: page * limit,
      take: limit,
    });

    const tokenAddresses = new Set(swaps.flatMap((swap) => [swap.tokenIn, swap.tokenOut]));
    const tokens = await prisma.token.findMany({
      where: {
        chainId: { in: Array.from(new Set(swaps.map((swap) => swap.chainId))) },
        address: { in: Array.from(tokenAddresses) },
      },
    });

    const tokenMap = new Map(tokens.map((token) => [`${token.chainId}:${token.address}`, token]));
    const chainMap = new Map(listChains().map((chain) => [chain.id, chain.name]));

    return NextResponse.json({
      items: swaps.map((swap) => {
        const tokenIn = tokenMap.get(`${swap.chainId}:${swap.tokenIn}`);
        const tokenOut = tokenMap.get(`${swap.chainId}:${swap.tokenOut}`);
        return {
          chainId: swap.chainId,
          chainName: chainMap.get(swap.chainId) ?? "Unknown",
          txHash: swap.txHash,
          blockNumber: Number(swap.blockNumber),
          timestamp: swap.timestamp,
          dex: swap.dex,
          pool: swap.pool,
          tokenIn: swap.tokenIn,
          tokenOut: swap.tokenOut,
          amountInDec: swap.amountInDec,
          amountOutDec: swap.amountOutDec,
          usdValue: swap.priced && swap.usdValue ? Number(swap.usdValue) : null,
          priced: swap.priced,
          symbolIn: tokenIn?.symbol ?? swap.tokenIn.slice(0, 6),
          symbolOut: tokenOut?.symbol ?? swap.tokenOut.slice(0, 6),
          tokenInName: tokenIn?.name ?? null,
          tokenOutName: tokenOut?.name ?? null,
          tokenInFirstSeenAt: tokenIn?.firstSeenAt ?? null,
          tokenOutFirstSeenAt: tokenOut?.firstSeenAt ?? null,
          tokenInVerified: tokenIn?.verified ?? false,
          tokenOutVerified: tokenOut?.verified ?? false,
        };
      }),
      page,
      limit,
    });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}
