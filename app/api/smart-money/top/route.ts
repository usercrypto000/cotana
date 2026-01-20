export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { listChains } from "@/services/chainConfig";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chainIdParam = searchParams.get("chain");
    const chainId = chainIdParam ? Number(chainIdParam) : null;
    const window = searchParams.get("window") ?? "30d";
    const minScore = Number(searchParams.get("minScore") ?? 0);
    const limit = clamp(Number(searchParams.get("limit") ?? 50), 1, 200);

    const where = {
      window,
      score: { gte: Number.isFinite(minScore) ? minScore : 0 },
      ...(chainId ? { chainId } : {}),
    };

    const scores = await prisma.walletScore.findMany({
      where,
      orderBy: { score: "desc" },
      take: limit,
    });

    const chainMap = new Map(listChains().map((chain) => [chain.id, chain.name]));

    return NextResponse.json({
      items: scores.map((score) => ({
        chainId: score.chainId,
        chainName: chainMap.get(score.chainId) ?? "Unknown",
        wallet: score.wallet,
        window: score.window,
        score: score.score,
        features: score.featuresJson,
        updatedAt: score.updatedAt,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}