export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";

export async function GET() {
  try {
    const items = await prisma.incentiveEvent.findMany({ orderBy: { id: "desc" } });
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const incentiveId = Number(body?.incentiveId);
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const eventType = typeof body?.eventType === "string" ? body.eventType.trim() : "";
    const effectiveAt = typeof body?.effectiveAt === "string" ? body.effectiveAt : "";

    if (!Number.isFinite(incentiveId) || !title || !eventType || !effectiveAt) {
      return NextResponse.json(
        { error: "incentiveId, title, eventType, effectiveAt required" },
        { status: 400 }
      );
    }

    const created = await prisma.incentiveEvent.create({
      data: {
        incentiveId,
        title,
        detail: typeof body?.detail === "string" ? body.detail.trim() : null,
        eventType,
        effectiveAt: new Date(effectiveAt),
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
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const eventType = typeof body?.eventType === "string" ? body.eventType.trim() : "";
    const effectiveAt = typeof body?.effectiveAt === "string" ? body.effectiveAt : "";

    if (!Number.isFinite(id) || !title || !eventType || !effectiveAt) {
      return NextResponse.json(
        { error: "id, title, eventType, effectiveAt required" },
        { status: 400 }
      );
    }

    const updated = await prisma.incentiveEvent.update({
      where: { id },
      data: {
        title,
        detail: typeof body?.detail === "string" ? body.detail.trim() : null,
        eventType,
        effectiveAt: new Date(effectiveAt),
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

    await prisma.incentiveEvent.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}
