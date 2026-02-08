import {
  IncidentLifecycleState,
  IncidentStatus,
  IncidentType,
} from "@prisma/client";
import { prisma } from "@/services/prisma";
import { requireTenantAuth } from "@/services/exploit-tracker/tenant-auth";
import { listTenantChains } from "@/services/exploit-tracker/tenants";

function parseIncidentType(value: string | null) {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase();
  if (normalized === "WALLET_DRAIN") return IncidentType.WALLET_DRAIN;
  if (normalized === "PROTOCOL_EXPLOIT") return IncidentType.PROTOCOL_EXPLOIT;
  if (normalized === "BRIDGE_EXPLOIT") return IncidentType.BRIDGE_EXPLOIT;
  return undefined;
}

function parseStatus(value: string | null) {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase();
  if (normalized === "OPEN") return IncidentStatus.OPEN;
  if (normalized === "MONITORING") return IncidentStatus.MONITORING;
  if (normalized === "RESOLVED") return IncidentStatus.RESOLVED;
  return undefined;
}

function parseLifecycle(value: string | null) {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase();
  if (normalized === "OPEN") return IncidentLifecycleState.OPEN;
  if (normalized === "EXPANDING") return IncidentLifecycleState.EXPANDING;
  if (normalized === "CONTAINED") return IncidentLifecycleState.CONTAINED;
  if (normalized === "RESOLVED") return IncidentLifecycleState.RESOLVED;
  if (normalized === "FALSE_POSITIVE") return IncidentLifecycleState.FALSE_POSITIVE;
  return undefined;
}

function parseDate(value: string | null) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

function toItem(item: any) {
  return {
    ...item,
    id: item.id.toString(),
    peakLossUsd: String(item.peakLossUsd ?? "0"),
    exploitConfidence: String(item.exploitConfidence ?? "0"),
    estimatedTotalLossUsd:
      item.estimatedTotalLossUsd === null ? null : String(item.estimatedTotalLossUsd),
    ruleHits: item.ruleHits.map((hit: any) => ({
      ...hit,
      id: hit.id.toString(),
      incidentId: hit.incidentId.toString(),
      valueDeltaUsd: hit.valueDeltaUsd === null ? null : String(hit.valueDeltaUsd),
    })),
    cashoutPaths: item.cashoutPaths.map((path: any) => ({
      ...path,
      id: path.id.toString(),
      incidentId: path.incidentId.toString(),
      totalUsd: path.totalUsd === null ? null : String(path.totalUsd),
      confidence: String(path.confidence ?? "0"),
    })),
    actorClusters: item.actorClusters.map((row: any) => ({
      ...row,
      id: row.id.toString(),
      incidentId: row.incidentId.toString(),
      clusterId: row.clusterId.toString(),
      confidence: String(row.confidence ?? "0"),
      cluster: {
        ...row.cluster,
        id: row.cluster.id.toString(),
        confidence: String(row.cluster.confidence ?? "0"),
      },
    })),
  };
}

export async function GET(request: Request) {
  try {
    const auth = await requireTenantAuth(request, true);
    const tenant = auth.tenant;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 50)));
    const chainId = Number(searchParams.get("chainId") ?? "");
    const minScore = Number(searchParams.get("minScore") ?? "0");
    const type = parseIncidentType(searchParams.get("type"));
    const status = parseStatus(searchParams.get("status"));
    const lifecycleState = parseLifecycle(searchParams.get("lifecycleState"));
    const projectKey = searchParams.get("projectKey")?.trim() || undefined;

    const cursor =
      parseDate(searchParams.get("cursor")) ||
      parseDate(searchParams.get("updatedAfter"));

    const tenantChains = await listTenantChains(tenant);
    if (Number.isFinite(chainId) && tenant.allowedChains.length > 0 && !tenantChains.includes(chainId)) {
      return Response.json({ error: "forbidden_chain" }, { status: 403 });
    }

    const allowedChains = Number.isFinite(chainId) ? [chainId] : tenantChains;

    const rows = await prisma.incident.findMany({
      where: {
        tenantId: tenant.id,
        chainId: { in: allowedChains },
        incidentType: {
          in: [IncidentType.WALLET_DRAIN, IncidentType.PROTOCOL_EXPLOIT, IncidentType.BRIDGE_EXPLOIT],
        },
        ...(Number.isFinite(minScore) && minScore > 0 ? { score: { gte: minScore } } : {}),
        ...(type ? { incidentType: type } : {}),
        ...(status ? { status } : {}),
        ...(lifecycleState ? { lifecycleState } : {}),
        ...(projectKey ? { projectKey } : {}),
        ...(cursor ? { updatedAt: { gt: cursor } } : {}),
      },
      orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
      take: limit + 1,
      include: {
        ruleHits: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        cashoutPaths: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        actorClusters: {
          include: {
            cluster: {
              select: {
                id: true,
                stableId: true,
                confidence: true,
                memberCount: true,
                firstSeenAt: true,
                lastSeenAt: true,
              },
            },
          },
          take: 5,
        },
      },
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return Response.json({
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
      },
      items: items.map(toItem),
      cursor: items.length > 0 ? items[items.length - 1]!.updatedAt.toISOString() : cursor?.toISOString() ?? null,
      hasMore,
    });
  } catch (err) {
    const message = String(err);
    const status = message.includes("api_key") ? 401 : 500;
    return Response.json(
      { error: "failed_to_list_incidents", detail: message },
      { status }
    );
  }
}
