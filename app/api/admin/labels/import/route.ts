export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/services/prisma";

type SeedLabel = {
  label: string;
  category: string;
};

export async function POST() {
  try {
    const filePath = path.join(process.cwd(), "data", "labels.seed.json");
    const raw = await readFile(filePath, "utf8");
    const items = JSON.parse(raw) as SeedLabel[];

    for (const item of items) {
      const label = item.label.trim();
      const category = item.category.trim();
      if (!label || !category) continue;
      await prisma.label.upsert({
        where: { label },
        update: { category },
        create: { label, category },
      });
    }

    return NextResponse.json({ ok: true, count: items.length });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}