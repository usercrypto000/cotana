// app/api/ai/summary/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { summarizeWithLocalModel } from "@/services/localModel";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const system = typeof body?.system === "string" ? body.system : "";
    const user = typeof body?.user === "string" ? body.user : "";

    if (!user.trim()) {
      return NextResponse.json({ error: "user prompt is required" }, { status: 400 });
    }

    const result = await summarizeWithLocalModel({
      system: system || "You are Cotana, a DeFi research copilot.",
      user,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}
