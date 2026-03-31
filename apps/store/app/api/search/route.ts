import { analyticsEvents, trackServerEvent } from "@cotana/analytics";
import { createSearchEvent } from "@cotana/db";
import { checkRateLimit, getCacheValue, setCacheValue } from "@cotana/db/redis";
import { searchApps } from "@cotana/search";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/session";
import { getRequestIdentity } from "../../../lib/request";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const category = request.nextUrl.searchParams.get("category") ?? undefined;
  const normalizedQuery = query.trim().toLowerCase();
  const sessionUser = await getSessionUser();
  const actor = getRequestIdentity(request, sessionUser?.id);
  const rateLimit = await checkRateLimit(`rate:search:${actor}`, 30, 60);

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Search rate limit exceeded." }, { status: 429 });
  }

  if (!normalizedQuery) {
    return NextResponse.json({
      query: normalizedQuery,
      categoryHint: null,
      searchEventId: null,
      results: []
    });
  }

  const searchEvent = await createSearchEvent({
    userId: sessionUser?.id ?? null,
    query,
    normalizedQuery,
    categoryHint: category ?? null
  });
  const cacheKey = `search:${normalizedQuery}:${category ?? "all"}`;
  const cached = await getCacheValue<{
    categoryHint: string | null;
    results: Array<Record<string, unknown>>;
  }>(cacheKey);
  let responsePayload = cached;

  if (!responsePayload) {
    const result = await searchApps(query, {
      categorySlug: category,
      limit: 12
    });

    responsePayload = {
      categoryHint: result.categoryHint,
      results: result.results.map((candidate) => ({
        ...candidate.app,
        similarity: candidate.similarity,
        score: candidate.score ?? 0
      }))
    };

    await setCacheValue(cacheKey, responsePayload, 60 * 5);
  }

  void trackServerEvent({
    event: analyticsEvents.searchSubmitted,
    distinctId: sessionUser?.id ?? actor,
    properties: {
      query,
      normalizedQuery,
      categoryHint: responsePayload.categoryHint
    }
  });

  return NextResponse.json({
    query: normalizedQuery,
    categoryHint: responsePayload.categoryHint,
    searchEventId: searchEvent.id,
    results: responsePayload.results
  });
}
