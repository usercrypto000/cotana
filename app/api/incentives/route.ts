export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";

const parseEnum = (value: string) => value.trim().toUpperCase();

const roiRank: Record<string, number> = {
  ASYMMETRIC: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const effortRank: Record<string, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};

const sortInMemory = (items: any[], sort: string) => {
  if (sort === "best_roi") {
    return [...items].sort((a, b) => {
      const aRank = roiRank[String(a.roiLabel ?? "").toUpperCase()] ?? 0;
      const bRank = roiRank[String(b.roiLabel ?? "").toUpperCase()] ?? 0;
      return bRank - aRank;
    });
  }
  if (sort === "lowest_effort") {
    return [...items].sort((a, b) => {
      const aRank = effortRank[String(a.effortLabel ?? "").toUpperCase()] ?? 99;
      const bRank = effortRank[String(b.effortLabel ?? "").toUpperCase()] ?? 99;
      return aRank - bRank;
    });
  }
  return items;
};

export async function GET(req: Request) {
  try {
    const now = new Date();
    await prisma.project.updateMany({
      where: {
        archived: false,
        incentives: {
          some: { endAt: { not: null } },
        },
        AND: [
          { incentives: { every: { endAt: { lt: now } } } },
          { incentives: { none: { endAt: null } } },
        ],
      },
      data: { archived: true },
    });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "";
    const chain = searchParams.get("chain") ?? "";
    const capital = searchParams.get("capital") ?? "";
    const risk = searchParams.get("risk") ?? "";
    const saturation = searchParams.get("saturation") ?? "";
    const earlyOnly = searchParams.get("earlyOnly") === "true";
    const sort = searchParams.get("sort") ?? "fresh";
    const q = searchParams.get("q") ?? "";

    const where: any = {};
    if (type) {
      where.types = { has: type };
    }
    if (capital) {
      where.capitalRequired = parseEnum(capital);
    }
    if (saturation) {
      where.status = parseEnum(saturation);
    }
    if (earlyOnly) {
      where.status = "EARLY";
    }
    if (risk) {
      if (risk === "Unknown") {
        where.riskScore = null;
      } else {
        const level = parseEnum(risk);
        const ranges: Record<string, { min: number; max: number }> = {
          LOW: { min: 0, max: 3 },
          MED: { min: 4, max: 6 },
          HIGH: { min: 7, max: 10 },
        };
        const range = ranges[level];
        if (range) {
          where.riskScore = { gte: range.min, lte: range.max };
        }
      }
    }
    if (chain) {
      where.project = { chains: { has: chain } };
    }
    where.project = { ...(where.project ?? {}), archived: false };

    if (q) {
      where.OR = [
        { project: { name: { contains: q, mode: "insensitive" } } },
        { project: { description: { contains: q, mode: "insensitive" } } },
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { rewardAssets: { contains: q, mode: "insensitive" } },
        { rewardAssetSymbol: { contains: q, mode: "insensitive" } },
        { flowSummary: { contains: q, mode: "insensitive" } },
      ];
    }

    let orderBy: any = { lastUpdatedAt: "desc" };
    if (sort === "least_saturated") {
      orderBy = [{ saturationScore: "asc" }, { lastUpdatedAt: "desc" }];
    }

    const incentives = await prisma.incentive.findMany({
      where,
      orderBy,
      include: {
        project: true,
        links: true,
        proofs: true,
        events: true,
        metrics: true,
      },
    });

    const items = sortInMemory(incentives, sort);

    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}
