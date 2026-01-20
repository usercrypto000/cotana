export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";

export async function GET() {
  try {
    const labels = await prisma.label.findMany({ orderBy: { label: "asc" } });
    return NextResponse.json({ items: labels });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const label = typeof body?.label === "string" ? body.label.trim() : "";
    const category = typeof body?.category === "string" ? body.category.trim() : "";

    if (!label || !category) {
      return NextResponse.json({ error: "label and category are required" }, { status: 400 });
    }

    const created = await prisma.label.create({ data: { label, category } });
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
    const category = typeof body?.category === "string" ? body.category.trim() : "";

    if (!Number.isFinite(id) || !label || !category) {
      return NextResponse.json({ error: "id, label, category required" }, { status: 400 });
    }

    const updated = await prisma.label.update({ where: { id }, data: { label, category } });
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

    await prisma.addressLabel.deleteMany({ where: { labelId: id } });
    await prisma.label.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}