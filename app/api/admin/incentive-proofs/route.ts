export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";

export async function GET() {
  try {
    const items = await prisma.incentiveProof.findMany({ orderBy: { id: "desc" } });
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const incentiveId = Number(body?.incentiveId);
    const proofType = typeof body?.proofType === "string" ? body.proofType.trim() : "";
    const label = typeof body?.label === "string" ? body.label.trim() : "";
    const url = typeof body?.url === "string" ? body.url.trim() : "";

    if (!Number.isFinite(incentiveId) || !proofType || !label || !url) {
      return NextResponse.json(
        { error: "incentiveId, proofType, label, url required" },
        { status: 400 }
      );
    }

    const created = await prisma.incentiveProof.create({
      data: {
        incentiveId,
        proofType,
        label,
        url,
        chain: typeof body?.chain === "string" ? body.chain.trim() : null,
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
    const proofType = typeof body?.proofType === "string" ? body.proofType.trim() : "";
    const label = typeof body?.label === "string" ? body.label.trim() : "";
    const url = typeof body?.url === "string" ? body.url.trim() : "";

    if (!Number.isFinite(id) || !proofType || !label || !url) {
      return NextResponse.json(
        { error: "id, proofType, label, url required" },
        { status: 400 }
      );
    }

    const updated = await prisma.incentiveProof.update({
      where: { id },
      data: {
        proofType,
        label,
        url,
        chain: typeof body?.chain === "string" ? body.chain.trim() : null,
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

    await prisma.incentiveProof.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}
