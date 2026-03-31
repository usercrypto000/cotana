import { getPublishedAppById, getPublishedAppBySlug } from "@cotana/db";
import { getCacheValue, setCacheValue } from "@cotana/db/redis";
import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/session";

type Params = {
  params: Promise<{ appId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const sessionUser = await getSessionUser();
  const { appId } = await params;
  const cacheKey = `app-detail:${appId}`;

  if (!sessionUser) {
    const cached = await getCacheValue<{ app: Awaited<ReturnType<typeof getPublishedAppBySlug>> }>(cacheKey);

    if (cached?.app) {
      return NextResponse.json(cached);
    }
  }

  const app =
    (await getPublishedAppById(appId, sessionUser?.id)) ?? (await getPublishedAppBySlug(appId, sessionUser?.id));

  if (!app) {
    return NextResponse.json({ error: "App not found." }, { status: 404 });
  }

  if (!sessionUser) {
    await setCacheValue(cacheKey, { app }, 60 * 5);
  }

  return NextResponse.json({ app });
}
