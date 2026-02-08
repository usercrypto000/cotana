import { checkPublicRateLimit } from "@/services/exploit-tracker/public-rate-limit";
import {
  listPublicIncidents,
  parseArchiveMonthFilter,
  parseChainFilter,
  parseHistoricalFilter,
  parseIncidentTypeFilter,
  parseLiveFilter,
} from "@/services/exploit-tracker/public-api";
import {
  PUBLIC_API_VERSION,
  v1ErrorEnvelope,
  v1ListEnvelope,
} from "@/services/exploit-tracker/public-schema-v1";

export async function GET(request: Request) {
  const limitPerMin = 180;

  try {
    const rl = await checkPublicRateLimit({
      request,
      endpointKey: "public_incidents",
      limitPerMin,
    });

    if (!rl.allowed) {
      return Response.json(v1ErrorEnvelope({ code: "rate_limited" }), {
        status: 429,
        headers: {
          "x-cotana-api-version": PUBLIC_API_VERSION,
        },
      });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 25)));
    const cursor = searchParams.get("cursor");
    const liveOnly = parseLiveFilter(searchParams.get("live"));
    const historical = parseHistoricalFilter(searchParams.get("historical"));
    const chainId = parseChainFilter(searchParams.get("chain"));
    const incidentType = parseIncidentTypeFilter(searchParams.get("type"));
    const protocol = searchParams.get("protocol");
    const archiveMonth = parseArchiveMonthFilter(searchParams.get("archive"));

    const result = await listPublicIncidents({
      limit,
      cursor,
      liveOnly,
      historical,
      chainId,
      incidentType,
      protocol,
      archiveMonth,
    });

    return Response.json(
      v1ListEnvelope({
        items: result.items,
        cursor: result.cursor,
        hasMore: result.hasMore,
        rateLimit: {
          limitPerMin,
          remaining: rl.remaining,
          used: rl.used,
        },
      }),
      {
        headers: {
          "x-cotana-api-version": PUBLIC_API_VERSION,
        },
      }
    );
  } catch (err) {
    return Response.json(
      v1ErrorEnvelope({
        code: "failed_to_list_public_incidents",
        detail: String(err),
      }),
      {
        status: 500,
        headers: {
          "x-cotana-api-version": PUBLIC_API_VERSION,
        },
      }
    );
  }
}
