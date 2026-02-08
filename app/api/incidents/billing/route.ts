import { prisma } from "@/services/prisma";
import { requireTenantAuth } from "@/services/exploit-tracker/tenant-auth";

export async function GET(request: Request) {
  try {
    const auth = await requireTenantAuth(request, true);
    const tenant = auth.tenant;

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const incidentVolume30d = await prisma.incident.count({
      where: {
        tenantId: tenant.id,
        createdAt: { gte: since },
      },
    });

    return Response.json({
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        billingModel: tenant.billingModel,
        monitoredTvlUsd: tenant.monitoredTvlUsd ? Number(tenant.monitoredTvlUsd) : null,
        incidentVolumeCap: tenant.incidentVolumeCap,
        trialMode: tenant.trialMode,
        trialAlertDelaySec: tenant.trialAlertDelaySec,
      },
      usage: {
        incidentVolume30d,
      },
      rateCardHint:
        tenant.billingModel === "INCIDENT_VOLUME"
          ? "bill_by_incident_volume"
          : "bill_by_monitored_tvl",
    });
  } catch (err) {
    const message = String(err);
    const status = message.includes("api_key") ? 401 : 500;
    return Response.json({ error: "failed_to_get_billing", detail: message }, { status });
  }
}
