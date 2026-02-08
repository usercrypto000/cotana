import { checkPublicRateLimit } from "@/services/exploit-tracker/public-rate-limit";
import {
  PUBLIC_API_VERSION,
  v1ErrorEnvelope,
  v1Meta,
} from "@/services/exploit-tracker/public-schema-v1";
import { getPublicStatusSnapshot } from "@/services/exploit-tracker/public-status";

export async function GET(request: Request) {
  const limitPerMin = 120;

  try {
    const rl = await checkPublicRateLimit({
      request,
      endpointKey: "public_status",
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

    const snapshot = await getPublicStatusSnapshot();
    return Response.json(
      {
        ...v1Meta({
          rateLimit: {
            limitPerMin,
            remaining: rl.remaining,
            used: rl.used,
          },
        }),
        ...snapshot,
      },
      {
        headers: {
          "x-cotana-api-version": PUBLIC_API_VERSION,
          "cache-control": "public, max-age=15, s-maxage=15",
        },
      }
    );
  } catch (err) {
    return Response.json(
      v1ErrorEnvelope({ code: "failed_to_load_public_status", detail: String(err) }),
      {
        status: 500,
        headers: {
          "x-cotana-api-version": PUBLIC_API_VERSION,
        },
      }
    );
  }
}

