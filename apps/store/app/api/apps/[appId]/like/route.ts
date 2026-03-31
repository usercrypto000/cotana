import { analyticsEvents, trackServerEvent } from "@cotana/analytics";
import { getPublishedAppById, toggleAppLike } from "@cotana/db";
import { checkRateLimit } from "@cotana/db/redis";
import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../../lib/session";

type Params = {
  params: Promise<{ appId: string }>;
};

async function updateLike(appId: string, liked: boolean) {
  const sessionUser = await getSessionUser();
  const rateLimit = await checkRateLimit(
    `rate:like:${sessionUser?.id ?? appId}:${appId}`,
    20,
    60,
  );

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many like requests." }, { status: 429 });
  }

  if (!sessionUser) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const app = await getPublishedAppById(appId, sessionUser.id);

  if (!app) {
    return NextResponse.json({ error: "App not found." }, { status: 404 });
  }

  const likeCount = await toggleAppLike(app.id, sessionUser.id, liked);

  if (liked) {
    void trackServerEvent({
      event: analyticsEvents.appLiked,
      distinctId: sessionUser.id,
      properties: {
        appId: app.id
      }
    });
  }

  return NextResponse.json({ liked, likeCount });
}

export async function POST(_request: Request, { params }: Params) {
  const { appId } = await params;
  return updateLike(appId, true);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { appId } = await params;
  return updateLike(appId, false);
}
