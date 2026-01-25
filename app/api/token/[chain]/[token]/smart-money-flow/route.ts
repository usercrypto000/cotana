export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { formatUnits } from "viem";
import { prisma } from "@/services/prisma";

function normalizeAddress(value: string) {
  return value.trim().toLowerCase();
}

function parseWindow(value: string) {
  if (!value) return 30;
  const match = value.match(/(\d+)d/);
  if (!match) return 30;
  return Number(match[1]);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export async function GET(
  req: Request,
  context: { params: { chain: string; token: string } }
) {
  try {
    const chainId = Number(context.params.chain);
    if (!Number.isFinite(chainId)) {
      return NextResponse.json({ error: "chain param required" }, { status: 400 });
    }
    const token = normalizeAddress(context.params.token);

    const { searchParams } = new URL(req.url);
    const window = searchParams.get("window") ?? "30d";
    const minScore = Number(searchParams.get("minScore") ?? 70);
    const limit = clamp(Number(searchParams.get("limit") ?? 1000), 1, 5000);

    const days = parseWindow(window);
    const since = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;

    const scored = await prisma.walletScore.findMany({
      where: {
        chainId,
        window,
        score: { gte: Number.isFinite(minScore) ? minScore : 70 },
      },
      orderBy: { score: "desc" },
      take: limit,
    });

    const wallets = scored.map((row) => row.wallet);
    if (wallets.length === 0) {
      return NextResponse.json({
        chainId,
        token,
        window,
        wallets: 0,
        buysRaw: "0",
        sellsRaw: "0",
        netAmountRaw: "0",
        netAmountDec: "0",
      });
    }

    const swaps = await prisma.swap.findMany({
      where: {
        chainId,
        trader: { in: wallets },
        timestamp: { gte: since },
        OR: [{ tokenIn: token }, { tokenOut: token }],
      },
    });

    let buys = 0n;
    let sells = 0n;

    for (const swap of swaps) {
      if (swap.tokenOut === token) buys += BigInt(swap.amountOutRaw.toFixed(0));
      if (swap.tokenIn === token) sells += BigInt(swap.amountInRaw.toFixed(0));
    }

    const net = buys - sells;
    const tokenMeta = await prisma.token.findUnique({
      where: { chainId_address: { chainId, address: token } },
    });
    const decimals = tokenMeta?.decimals ?? 18;

    return NextResponse.json({
      chainId,
      token,
      window,
      wallets: wallets.length,
      buysRaw: buys.toString(),
      sellsRaw: sells.toString(),
      netAmountRaw: net.toString(),
      netAmountDec: formatUnits(net, decimals),
    });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}