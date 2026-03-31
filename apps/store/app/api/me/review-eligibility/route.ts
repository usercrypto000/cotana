import { getPublishedAppById, getPublishedAppBySlug, getReviewEligibility } from "@cotana/db";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/session";

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const appId = request.nextUrl.searchParams.get("appId");

  if (!appId) {
    return NextResponse.json({ error: "appId is required." }, { status: 400 });
  }

  const app = (await getPublishedAppById(appId, sessionUser.id)) ?? (await getPublishedAppBySlug(appId, sessionUser.id));

  if (!app) {
    return NextResponse.json({ error: "App not found." }, { status: 404 });
  }

  const eligibility = await getReviewEligibility(sessionUser.id, app.id);

  return NextResponse.json({
    eligibility: {
      ...eligibility,
      nextEligibleAt: eligibility.nextEligibleAt?.toISOString() ?? null
    }
  });
}
