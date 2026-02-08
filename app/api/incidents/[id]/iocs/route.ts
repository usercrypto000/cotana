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
      select: {
        id: true,
        iocBundle: true,
        attackerAddresses: true,
        affectedContracts: true,
        topTxHashes: true,
        updatedAt: true,
      },
    });

    if (!incident) {
      return Response.json({ error: "incident_not_found" }, { status: 404 });
    }

    const bundle =
      incident.iocBundle ??
      ({
        generatedAt: incident.updatedAt.toISOString(),
        addresses: incident.attackerAddresses,
        contracts: incident.affectedContracts,
        txHashes: incident.topTxHashes,
        assets: [],
      } as const);

    return Response.json({
      incidentId: incident.id.toString(),
      bundle,
    });
  } catch (err) {
    const message = String(err);
    const status = message.includes("api_key") ? 401 : 500;
    return Response.json({ error: "failed_to_export_iocs", detail: message }, { status });
  }
}
