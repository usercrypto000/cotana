import { analyticsEvents, trackServerEvent } from "@cotana/analytics";
import { flagReview } from "@cotana/db";
import { checkRateLimit } from "@cotana/db/redis";
import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../../lib/session";
import { flagReviewSchema } from "../../../../../lib/validation";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`rate:review-flag:${sessionUser.id}`, 10, 60 * 60);

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Review flag rate limit exceeded." }, { status: 429 });
  }

  const payload = flagReviewSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const flag = await flagReview({
    reviewId: id,
    reporterUserId: sessionUser.id,
    reason: payload.data.reason
  });

  void trackServerEvent({
    event: analyticsEvents.reviewFlagged,
    distinctId: sessionUser.id,
    properties: {
      reviewId: id
    }
  });

  return NextResponse.json({ flag }, { status: 201 });
}
