import { analyticsEvents, trackServerEvent } from "@cotana/analytics";
import { getPublishedAppById, toggleLibraryItem } from "@cotana/db";
import { checkRateLimit } from "@cotana/db/redis";
import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../../lib/session";

type Params = {
  params: Promise<{ appId: string }>;
};

async function updateLibrary(appId: string, saved: boolean) {
  const sessionUser = await getSessionUser();
  const rateLimit = await checkRateLimit(
    `rate:library:${sessionUser?.id ?? appId}:${appId}`,
    20,
    60,
  );

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many save requests." }, { status: 429 });
  }

  if (!sessionUser) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const app = await getPublishedAppById(appId, sessionUser.id);

  if (!app) {
    return NextResponse.json({ error: "App not found." }, { status: 404 });
  }

  await toggleLibraryItem(app.id, sessionUser.id, saved);

  if (saved) {
    void trackServerEvent({
      event: analyticsEvents.appSaved,
      distinctId: sessionUser.id,
      properties: {
        appId: app.id
      }
    });
  }

  return NextResponse.json({ saved });
}

export async function POST(_request: Request, { params }: Params) {
  const { appId } = await params;
  return updateLibrary(appId, true);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { appId } = await params;
  return updateLibrary(appId, false);
}
