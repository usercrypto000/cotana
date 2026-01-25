export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";

const toDecimal = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

export async function GET() {
  try {
    const items = await prisma.incentiveMetric.findMany({ orderBy: { id: "desc" } });
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const incentiveId = Number(body?.incentiveId);

    if (!Number.isFinite(incentiveId)) {
      return NextResponse.json({ error: "incentiveId required" }, { status: 400 });
    }

    const created = await prisma.incentiveMetric.upsert({
      where: { incentiveId },
      update: {
        tvlUsd: toDecimal(body?.tvlUsd),
      },
      create: {
        incentiveId,
        tvlUsd: toDecimal(body?.tvlUsd),
      },
    });
    return NextResponse.json({ item: created });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const id = Number(body?.id);

    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const updated = await prisma.incentiveMetric.update({
      where: { id },
      data: {
        tvlUsd: toDecimal(body?.tvlUsd),
      },
    });
    return NextResponse.json({ item: updated });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const id = Number(body?.id);

    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await prisma.incentiveMetric.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}
