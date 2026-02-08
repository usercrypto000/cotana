import { requireTenantAuth } from "@/services/exploit-tracker/tenant-auth";
import { listTenantChains } from "@/services/exploit-tracker/tenants";
import { assertTrackerApiEnv } from "@/services/exploit-tracker/env";

export async function GET(request: Request) {
  try {
    assertTrackerApiEnv();
    const auth = await requireTenantAuth(request, true);
    const tenant = auth.tenant;
    const allowedChains = await listTenantChains(tenant);

    const host = process.env.EXPLOIT_WS_PUBLIC_HOST?.trim() || process.env.HOSTNAME || "localhost";
    const port = Number(process.env.EXPLOIT_WS_PORT ?? 8099);
    const secure = (process.env.EXPLOIT_WS_PUBLIC_SECURE ?? "false").toLowerCase() === "true";
    const proto = secure ? "wss" : "ws";

    return Response.json({
      url: `${proto}://${host}:${port}`,
      auth: "x-api-key header, API-key bearer token, or JWT bearer token",
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        allowedChains,
        wsRateLimitPerMin: tenant.wsRateLimitPerMin,
      },
      resumeCursorParam: "updatedAfter",
      subscribeMessage: {
        action: "subscribe",
        chainId: "optional number",
        minScore: "optional number",
        type: "optional IncidentType",
        lifecycleState: "optional IncidentLifecycleState",
        projectKey: "optional string",
        updatedAfter: "optional ISO date",
        pollMs: "optional 1000-30000",
      },
    });
  } catch (err) {
    const message = String(err);
    const status = message.includes("api_key") ? 401 : 500;
    return Response.json({ error: "failed_to_get_ws_info", detail: message }, { status });
  }
}
