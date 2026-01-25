export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";

export async function GET() {
  try {
    const items = await prisma.incentiveLink.findMany({ orderBy: { id: "desc" } });
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const incentiveId = Number(body?.targetId);
    const label = typeof body?.label === "string" ? body.label.trim() : "";
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    const type = typeof body?.type === "string" ? body.type : "";
    const tier = typeof body?.tier === "string" ? body.tier : "";

    if (!Number.isFinite(incentiveId) || !label || !url || !type) {
      return NextResponse.json(
        { error: "targetId, label, url, type required" },
        { status: 400 }
      );
    }

    const created = await prisma.incentiveLink.create({
      data: {
        incentiveId,
        label,
        url,
        type: type as any,
        tier: tier ? (tier as any) : null,
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
    const label = typeof body?.label === "string" ? body.label.trim() : "";
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    const type = typeof body?.type === "string" ? body.type : "";
    const tier = typeof body?.tier === "string" ? body.tier : "";

    if (!Number.isFinite(id) || !label || !url || !type) {
      return NextResponse.json(
        { error: "id, label, url, type required" },
        { status: 400 }
      );
    }

    const updated = await prisma.incentiveLink.update({
      where: { id },
      data: { label, url, type: type as any, tier: tier ? (tier as any) : null },
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

    await prisma.incentiveLink.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}
