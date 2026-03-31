import { analyticsEvents, trackServerEvent } from "@cotana/analytics";
import { createReview, getPublishedAppById } from "@cotana/db";
import { checkRateLimit } from "@cotana/db/redis";
import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../../lib/session";
import { createReviewSchema } from "../../../../../lib/validation";

type Params = {
  params: Promise<{ appId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`rate:review:${sessionUser.id}`, 5, 60 * 60);

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Review rate limit exceeded." }, { status: 429 });
  }

  const payload = createReviewSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const { appId } = await params;
  const app = await getPublishedAppById(appId, sessionUser.id);

  if (!app) {
    return NextResponse.json({ error: "App not found." }, { status: 404 });
  }

  const result = await createReview({
    appId: app.id,
    userId: sessionUser.id,
    rating: payload.data.rating,
    body: payload.data.body
  });

  if (!result.review) {
    return NextResponse.json(
      {
        error: result.eligibility.reasons[0] ?? "Review is not eligible yet.",
        eligibility: {
          ...result.eligibility,
          nextEligibleAt: result.eligibility.nextEligibleAt?.toISOString() ?? null
        }
      },
      { status: 400 },
    );
  }

  void trackServerEvent({
    event: analyticsEvents.reviewCreated,
    distinctId: sessionUser.id,
    properties: {
      appId: app.id,
      rating: payload.data.rating
    }
  });

  return NextResponse.json({ review: result.review }, { status: 201 });
}
