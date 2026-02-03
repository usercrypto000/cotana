export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";

const readToken = (req: Request) => {
  const header = req.headers.get("x-admin-token");
  if (header) return header;
  const auth = req.headers.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return null;
};

export async function POST(req: Request) {
  try {
    const token = readToken(req);
    const expected = process.env.ADMIN_BOT_TOKEN ?? "";
    if (!expected || token !== expected) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    if (!slug) {
      return NextResponse.json({ error: "slug required" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { slug } });
    if (!project) {
      return NextResponse.json({ error: "project not found" }, { status: 404 });
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { archived: true, archivedAt: new Date() },
    });

    return NextResponse.json({ item: updated });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}
