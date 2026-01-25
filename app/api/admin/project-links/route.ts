export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";

export async function GET() {
  try {
    const items = await prisma.projectLink.findMany({ orderBy: { id: "desc" } });
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const projectId = Number(body?.targetId);
    const label = typeof body?.label === "string" ? body.label.trim() : "";
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    const type = typeof body?.type === "string" ? body.type : "";
    const tier = typeof body?.tier === "string" ? body.tier : "";

    if (!Number.isFinite(projectId) || !label || !url || !type || !tier) {
      return NextResponse.json(
        { error: "targetId, label, url, type, tier required" },
        { status: 400 }
      );
    }

    const created = await prisma.projectLink.create({
      data: {
        projectId,
        label,
        url,
        type: type as any,
        tier: tier as any,
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

    if (!Number.isFinite(id) || !label || !url || !type || !tier) {
      return NextResponse.json(
        { error: "id, label, url, type, tier required" },
        { status: 400 }
      );
    }

    const updated = await prisma.projectLink.update({
      where: { id },
      data: { label, url, type: type as any, tier: tier as any },
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

    await prisma.projectLink.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}
