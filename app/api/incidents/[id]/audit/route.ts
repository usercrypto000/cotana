import { requireTenantAuth } from "@/services/exploit-tracker/tenant-auth";
import { prisma } from "@/services/prisma";

type Params = { params: { id: string } | Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const auth = await requireTenantAuth(request, true);
    const resolved = await Promise.resolve(params);

    let id: bigint;
    try {
      id = BigInt(resolved.id);
    } catch {
      return Response.json({ error: "invalid_incident_id" }, { status: 400 });
    }

    const incident = await prisma.incident.findFirst({
      where: { id, tenantId: auth.tenant.id },
      select: { id: true },
    });

    if (!incident) {
      return Response.json({ error: "incident_not_found" }, { status: 404 });
    }

    const logs = await prisma.incidentAuditLog.findMany({
      where: { tenantId: auth.tenant.id, incidentId: id },
      orderBy: { createdAt: "desc" },
      take: 300,
    });

    return Response.json({
      items: logs.map((log) => ({
        ...log,
        id: log.id.toString(),
        incidentId: log.incidentId ? log.incidentId.toString() : null,
      })),
    });
  } catch (err) {
    const message = String(err);
    const status = message.includes("api_key") ? 401 : 500;
    return Response.json({ error: "failed_to_list_incident_audit", detail: message }, { status });
  }
}
