import { checkPublicRateLimit } from "@/services/exploit-tracker/public-rate-limit";
import { buildAtom, loadRecentPublicFeedIncidents } from "@/services/exploit-tracker/public-feeds";

export async function GET(request: Request) {
  const rl = await checkPublicRateLimit({
    request,
    endpointKey: "public_incidents_atom",
    limitPerMin: 120,
  });
  if (!rl.allowed) {
    return new Response("rate_limited", { status: 429 });
  }

  const { origin } = new URL(request.url);
  const items = await loadRecentPublicFeedIncidents(80);
  const xml = buildAtom(items, origin);

  return new Response(xml, {
    headers: {
      "content-type": "application/atom+xml; charset=utf-8",
      "cache-control": "public, max-age=60, s-maxage=60",
    },
  });
}

