import { checkPublicRateLimit } from "@/services/exploit-tracker/public-rate-limit";
import {
  buildStaticIncidentJsonFeed,
  loadRecentPublicFeedIncidents,
} from "@/services/exploit-tracker/public-feeds";

export async function GET(request: Request) {
  const rl = await checkPublicRateLimit({
    request,
    endpointKey: "public_incidents_json_feed",
    limitPerMin: 160,
  });

  if (!rl.allowed) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  const { origin } = new URL(request.url);
  const items = await loadRecentPublicFeedIncidents(100);
  const payload = buildStaticIncidentJsonFeed(items, origin);

  return Response.json(payload, {
    headers: {
      "cache-control": "public, max-age=60, s-maxage=60",
    },
  });
}

