export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { normalizeList } from "@/services/incentive-utils";

export async function GET() {
  try {
    const items = await prisma.project.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    const chains = normalizeList(body?.chains);
    const tags = normalizeList(body?.tags);

    if (!name || !slug) {
      return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
    }

    const created = await prisma.project.create({
      data: {
        name,
        slug,
        description: typeof body?.description === "string" ? body.description.trim() : null,
        raise: typeof body?.raise === "string" ? body.raise.trim() : null,
        website: typeof body?.website === "string" ? body.website.trim() : null,
        logoUrl: typeof body?.logoUrl === "string" ? body.logoUrl.trim() : null,
        chains,
        tags,
        archived: Boolean(body?.archived),
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
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    const chains = normalizeList(body?.chains);
    const tags = normalizeList(body?.tags);

    if (!Number.isFinite(id) || !name || !slug) {
      return NextResponse.json({ error: "id, name, slug required" }, { status: 400 });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        name,
        slug,
        description: typeof body?.description === "string" ? body.description.trim() : null,
        raise: typeof body?.raise === "string" ? body.raise.trim() : null,
        website: typeof body?.website === "string" ? body.website.trim() : null,
        logoUrl: typeof body?.logoUrl === "string" ? body.logoUrl.trim() : null,
        chains,
        tags,
        archived: Boolean(body?.archived),
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

    const incentives = await prisma.incentive.findMany({
      where: { projectId: id },
      select: { id: true },
    });
    const incentiveIds = incentives.map((item) => item.id);

    if (incentiveIds.length) {
      await prisma.incentiveEvent.deleteMany({ where: { incentiveId: { in: incentiveIds } } });
      await prisma.incentiveLink.deleteMany({ where: { incentiveId: { in: incentiveIds } } });
      await prisma.incentiveProof.deleteMany({ where: { incentiveId: { in: incentiveIds } } });
      await prisma.incentiveMetric.deleteMany({ where: { incentiveId: { in: incentiveIds } } });
      await prisma.incentive.deleteMany({ where: { id: { in: incentiveIds } } });
    }

    await prisma.projectLink.deleteMany({ where: { projectId: id } });
    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}
