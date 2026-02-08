import { requireTenantAuth } from "@/services/exploit-tracker/tenant-auth";
import { loadTenantObservability } from "@/services/exploit-tracker/observability";

export async function GET(request: Request) {
  try {
    const auth = await requireTenantAuth(request, true);
    const metrics = await loadTenantObservability(auth.tenant.id);
    return Response.json(metrics);
  } catch (err) {
    const message = String(err);
    const status = message.includes("api_key") ? 401 : 500;
    return Response.json({ error: "failed_to_load_metrics", detail: message }, { status });
  }
}
