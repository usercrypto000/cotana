export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";

type Params = { params: { id: string } | Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const resolved = await Promise.resolve(params);
    const id = Number(resolved.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    const incentive = await prisma.incentive.findUnique({
      where: { id },
      include: {
        project: true,
        links: true,
        proofs: true,
        events: true,
        metrics: true,
      },
    });

    if (!incentive) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    return NextResponse.json({ item: incentive });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}
