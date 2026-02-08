import { checkPublicRateLimit } from "@/services/exploit-tracker/public-rate-limit";
import { buildRss, loadRecentPublicFeedIncidents } from "@/services/exploit-tracker/public-feeds";

export async function GET(request: Request) {
  const rl = await checkPublicRateLimit({
    request,
    endpointKey: "public_incidents_rss",
    limitPerMin: 120,
  });
  if (!rl.allowed) {
    return new Response("rate_limited", { status: 429 });
  }

  const { origin } = new URL(request.url);
  const items = await loadRecentPublicFeedIncidents(80);
  const xml = buildRss(items, origin);

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=60, s-maxage=60",
    },
  });
}

