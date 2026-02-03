export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { runSaturationSync } from "@/services/saturation-sync";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const incentiveId = Number(body?.incentiveId);

    const result = await runSaturationSync({
      incentiveId: Number.isFinite(incentiveId) ? incentiveId : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: "sync_failed", detail: String(err) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await runSaturationSync();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: "sync_failed", detail: String(err) }, { status: 500 });
  }
}
