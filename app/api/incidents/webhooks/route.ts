import { prisma } from "@/services/prisma";
import { actorFromRequestHeaders, logIncidentAudit } from "@/services/exploit-tracker/audit";
import { requireTenantAuth } from "@/services/exploit-tracker/tenant-auth";

type EndpointInput = {
  id?: string;
  url: string;
  secret?: string | null;
  active?: boolean;
  eventTypes?: string[];
  maxRetries?: number;
  timeoutMs?: number;
};

type PatchBody = {
  upsert?: EndpointInput;
  deactivateId?: string;
};

export async function GET(request: Request) {
  try {
    const auth = await requireTenantAuth(request, true);

    const [endpoints, deliveries] = await Promise.all([
      prisma.tenantWebhookEndpoint.findMany({
        where: { tenantId: auth.tenant.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.webhookDelivery.findMany({
        where: { tenantId: auth.tenant.id },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);

    return Response.json({
      endpoints: endpoints.map((row) => ({
        ...row,
        id: row.id.toString(),
      })),
      deliveries: deliveries.map((row) => ({
        ...row,
        id: row.id.toString(),
        incidentId: row.incidentId ? row.incidentId.toString() : null,
        endpointId: row.endpointId.toString(),
      })),
    });
  } catch (err) {
    const message = String(err);
    const status = message.includes("api_key") ? 401 : 500;
    return Response.json({ error: "failed_to_get_webhooks", detail: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireTenantAuth(request, true);
    const actor = actorFromRequestHeaders(request, `apiKey:${auth.apiKeyId}`);
    const body = (await request.json()) as PatchBody;

    if (body.deactivateId) {
      let id: bigint;
      try {
        id = BigInt(body.deactivateId);
      } catch {
        return Response.json({ error: "invalid_endpoint_id" }, { status: 400 });
      }

      const row = await prisma.tenantWebhookEndpoint.updateMany({
        where: { id, tenantId: auth.tenant.id },
        data: { active: false },
      });

      await logIncidentAudit({
        tenantId: auth.tenant.id,
        incidentId: null,
        actor,
        action: "webhook.deactivate",
        detail: { endpointId: body.deactivateId, updated: row.count },
      });

      return Response.json({ ok: row.count > 0 });
    }

    if (body.upsert) {
      const url = body.upsert.url?.trim();
      if (!url) return Response.json({ error: "missing_url" }, { status: 400 });

      const endpoint = await prisma.tenantWebhookEndpoint.upsert({
        where: {
          tenantId_url: {
            tenantId: auth.tenant.id,
            url,
          },
        },
        create: {
          tenantId: auth.tenant.id,
          url,
          secret: body.upsert.secret ?? null,
          active: body.upsert.active ?? true,
          eventTypes:
            body.upsert.eventTypes && body.upsert.eventTypes.length > 0
              ? body.upsert.eventTypes
              : ["incident.created", "incident.updated"],
          maxRetries: Math.max(1, Math.min(20, Math.floor(body.upsert.maxRetries ?? 8))),
          timeoutMs: Math.max(1000, Math.min(30_000, Math.floor(body.upsert.timeoutMs ?? 8000))),
        },
        update: {
          secret: body.upsert.secret ?? null,
          active: body.upsert.active ?? true,
          eventTypes:
            body.upsert.eventTypes && body.upsert.eventTypes.length > 0
              ? body.upsert.eventTypes
              : ["incident.created", "incident.updated"],
          maxRetries: Math.max(1, Math.min(20, Math.floor(body.upsert.maxRetries ?? 8))),
          timeoutMs: Math.max(1000, Math.min(30_000, Math.floor(body.upsert.timeoutMs ?? 8000))),
        },
      });

      await logIncidentAudit({
        tenantId: auth.tenant.id,
        incidentId: null,
        actor,
        action: "webhook.upsert",
        detail: { endpointId: endpoint.id.toString(), url },
      });

      return Response.json({
        item: {
          ...endpoint,
          id: endpoint.id.toString(),
        },
      });
    }

    return Response.json({ error: "invalid_patch_body" }, { status: 400 });
  } catch (err) {
    const message = String(err);
    const status = message.includes("api_key") ? 401 : 500;
    return Response.json({ error: "failed_to_update_webhooks", detail: message }, { status });
  }
}
