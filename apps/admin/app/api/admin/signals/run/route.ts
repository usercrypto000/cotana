import { isAdminUser } from "@cotana/auth/authorization";
import { NextResponse } from "next/server";
import { z } from "zod";
import { runManualSignalJob } from "../../../../../lib/jobs";
import { getSessionUser } from "../../../../../lib/session";

const payloadSchema = z.object({
  jobKey: z.enum([
    "signals.refresh.defi",
    "signals.refresh.lending_yield",
    "signals.refresh.prediction_markets",
    "snapshots.weekly",
    "trending.recompute",
    "community_pick.recompute"
  ])
});

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = payloadSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const summary = await runManualSignalJob(payload.data.jobKey);
  return NextResponse.json({ summary });
}
