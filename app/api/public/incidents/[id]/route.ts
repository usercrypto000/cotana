import { checkPublicRateLimit } from "@/services/exploit-tracker/public-rate-limit";
import { getPublicIncidentById } from "@/services/exploit-tracker/public-api";
import {
  PUBLIC_API_VERSION,
  v1DetailEnvelope,
  v1ErrorEnvelope,
} from "@/services/exploit-tracker/public-schema-v1";

type Params = { params: { id: string } | Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const limitPerMin = 240;

  try {
    const rl = await checkPublicRateLimit({
      request,
      endpointKey: "public_incident_detail",
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

    const resolved = await Promise.resolve(params);
    let id: bigint;
    try {
      id = BigInt(resolved.id);
    } catch {
      return Response.json(v1ErrorEnvelope({ code: "invalid_incident_id" }), {
        status: 400,
        headers: {
          "x-cotana-api-version": PUBLIC_API_VERSION,
        },
      });
    }

    const item = await getPublicIncidentById(id);
    if (!item) {
      return Response.json(v1ErrorEnvelope({ code: "incident_not_found" }), {
        status: 404,
        headers: {
          "x-cotana-api-version": PUBLIC_API_VERSION,
        },
      });
    }

    return Response.json(
      v1DetailEnvelope({
        item,
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
        code: "failed_to_get_public_incident",
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
