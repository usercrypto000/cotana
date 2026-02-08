import { prisma } from "@/services/prisma";
import { actorFromRequestHeaders, logIncidentAudit } from "@/services/exploit-tracker/audit";
import { requireTenantAuth } from "@/services/exploit-tracker/tenant-auth";

type Body = {
  trialMode?: boolean;
  trialAlertDelaySec?: number;
  billingModel?: "INCIDENT_VOLUME" | "MONITORED_TVL";
  monitoredTvlUsd?: number | null;
  incidentVolumeCap?: number | null;
  publicFeedEnabled?: boolean;
};

export async function GET(request: Request) {
  try {
    const auth = await requireTenantAuth(request, true);
    return Response.json({
      item: {
        id: auth.tenant.id,
        slug: auth.tenant.slug,
        trialMode: auth.tenant.trialMode,
        trialAlertDelaySec: auth.tenant.trialAlertDelaySec,
        billingModel: auth.tenant.billingModel,
        monitoredTvlUsd: auth.tenant.monitoredTvlUsd
          ? Number(auth.tenant.monitoredTvlUsd)
          : null,
        incidentVolumeCap: auth.tenant.incidentVolumeCap,
        publicFeedEnabled: auth.tenant.publicFeedEnabled,
      },
    });
  } catch (err) {
    const message = String(err);
    const status = message.includes("api_key") ? 401 : 500;
    return Response.json({ error: "failed_to_get_settings", detail: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireTenantAuth(request, true);
    const actor = actorFromRequestHeaders(request, `apiKey:${auth.apiKeyId}`);
    const body = (await request.json()) as Body;

    const updated = await prisma.tenant.update({
      where: { id: auth.tenant.id },
      data: {
        trialMode: body.trialMode === undefined ? auth.tenant.trialMode : Boolean(body.trialMode),
        trialAlertDelaySec:
          body.trialAlertDelaySec === undefined
            ? auth.tenant.trialAlertDelaySec
            : Math.max(0, Math.min(86400, Math.floor(body.trialAlertDelaySec))),
        billingModel: body.billingModel ?? auth.tenant.billingModel,
        monitoredTvlUsd:
          body.monitoredTvlUsd === undefined
            ? auth.tenant.monitoredTvlUsd
            : body.monitoredTvlUsd === null
            ? null
            : body.monitoredTvlUsd,
        incidentVolumeCap:
          body.incidentVolumeCap === undefined
            ? auth.tenant.incidentVolumeCap
            : body.incidentVolumeCap === null
            ? null
            : Math.max(0, Math.floor(body.incidentVolumeCap)),
        publicFeedEnabled:
          body.publicFeedEnabled === undefined
            ? auth.tenant.publicFeedEnabled
            : Boolean(body.publicFeedEnabled),
      },
    });

    await logIncidentAudit({
      tenantId: auth.tenant.id,
      incidentId: null,
      actor,
      action: "tenant.settings.update",
      detail: {
        trialMode: updated.trialMode,
        trialAlertDelaySec: updated.trialAlertDelaySec,
        billingModel: updated.billingModel,
        publicFeedEnabled: updated.publicFeedEnabled,
      },
    });

    return Response.json({
      item: {
        id: updated.id,
        slug: updated.slug,
        trialMode: updated.trialMode,
        trialAlertDelaySec: updated.trialAlertDelaySec,
        billingModel: updated.billingModel,
        monitoredTvlUsd: updated.monitoredTvlUsd ? Number(updated.monitoredTvlUsd) : null,
        incidentVolumeCap: updated.incidentVolumeCap,
        publicFeedEnabled: updated.publicFeedEnabled,
      },
    });
  } catch (err) {
    const message = String(err);
    const status = message.includes("api_key") ? 401 : 500;
    return Response.json({ error: "failed_to_update_settings", detail: message }, { status });
  }
}
