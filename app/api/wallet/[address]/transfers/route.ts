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

export async function GET(
  req: Request,
  context: { params: { address: string } | Promise<{ address: string }> }
) {
  try {
    const { searchParams } = new URL(req.url);
    const chainIdParam = searchParams.get("chain");
    const chainId = chainIdParam ? Number(chainIdParam) : null;
    const limit = clamp(Number(searchParams.get("limit") ?? 50), 1, 200);
    const page = clamp(Number(searchParams.get("page") ?? 0), 0, 1000);
    const resolved = await Promise.resolve(context.params);
    const address = normalizeAddress(resolved.address);

    const transfers = await prisma.tokenTransfer.findMany({
      where: {
        ...(chainId ? { chainId } : {}),
        OR: [{ from: address }, { to: address }],
      },
      orderBy: [{ timestamp: "desc" }, { logIndex: "desc" }],
      skip: page * limit,
      take: limit,
    });

    const tokenAddresses = new Set(transfers.map((transfer) => transfer.token));
    const tokens = await prisma.token.findMany({
      where: {
        chainId: { in: Array.from(new Set(transfers.map((transfer) => transfer.chainId))) },
        address: { in: Array.from(tokenAddresses) },
      },
    });

    const tokenMap = new Map(tokens.map((token) => [`${token.chainId}:${token.address}`, token]));
    const chainMap = new Map(listChains().map((chain) => [chain.id, chain.name]));

    return NextResponse.json({
      items: transfers.map((transfer) => {
        const token = tokenMap.get(`${transfer.chainId}:${transfer.token}`);
        return {
          chainId: transfer.chainId,
          chainName: chainMap.get(transfer.chainId) ?? "Unknown",
          txHash: transfer.txHash,
          blockNumber: Number(transfer.blockNumber),
          timestamp: transfer.timestamp,
          token: transfer.token,
          symbol: token?.symbol ?? transfer.token.slice(0, 6),
          from: transfer.from,
          to: transfer.to,
          amountDec: transfer.amountDec,
        };
      }),
      page,
      limit,
    });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}
