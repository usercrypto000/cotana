import {
  IncidentLifecycleState,
  Prisma,
  IncidentStatus,
  IncidentType,
} from "@prisma/client";
import { prisma } from "@/services/prisma";
import {
  checkTenantRateLimit,
  requireTenantAuth,
} from "@/services/exploit-tracker/tenant-auth";
import { listTenantChains } from "@/services/exploit-tracker/tenants";

export const runtime = "nodejs";

type StreamItem = {
  id: string;
  tenantId: number;
  chainId: number;
  incidentType: string;
  status: string;
  lifecycleState: string;
  score: number;
  exploitConfidence: string;
  estimatedTotalLossUsd: string | null;
  peakLossUsd: string;
  affectedContracts: string[];
  attackerAddresses: string[];
  victimAddresses: string[];
  topTxHashes: string[];
  exploitVectors: string[];
  projectKey: string | null;
  ruleVersion: string;
  ruleSummary: string | null;
  lastActivityAt: string;
  updatedAt: string;
  createdAt: string;
};

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

function encodeSse(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

function toStreamItem(item: {
  id: bigint;
  tenantId: number;
  chainId: number;
  incidentType: IncidentType;
  status: IncidentStatus;
  lifecycleState: IncidentLifecycleState;
  score: number;
  exploitConfidence: Prisma.Decimal;
  estimatedTotalLossUsd: Prisma.Decimal | null;
  peakLossUsd: Prisma.Decimal;
  affectedContracts: string[];
  attackerAddresses: string[];
  victimAddresses: string[];
  topTxHashes: string[];
  exploitVectors: IncidentType[];
  projectKey: string | null;
  ruleVersion: string;
  ruleSummary: string | null;
  lastActivityAt: Date;
  updatedAt: Date;
  createdAt: Date;
}): StreamItem {
  return {
    id: item.id.toString(),
    tenantId: item.tenantId,
    chainId: item.chainId,
    incidentType: item.incidentType,
    status: item.status,
    lifecycleState: item.lifecycleState,
    score: item.score,
    exploitConfidence: String(item.exploitConfidence ?? "0"),
    estimatedTotalLossUsd:
      item.estimatedTotalLossUsd === null
        ? null
        : String(item.estimatedTotalLossUsd),
    peakLossUsd: String(item.peakLossUsd ?? "0"),
    affectedContracts: item.affectedContracts,
    attackerAddresses: item.attackerAddresses,
    victimAddresses: item.victimAddresses,
    topTxHashes: item.topTxHashes,
    exploitVectors: item.exploitVectors.map((value) => String(value)),
    projectKey: item.projectKey,
    ruleVersion: item.ruleVersion,
    ruleSummary: item.ruleSummary,
    lastActivityAt: item.lastActivityAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    createdAt: item.createdAt.toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const auth = await requireTenantAuth(request, true);
    const tenant = auth.tenant;

    const rl = await checkTenantRateLimit({
      tenantId: tenant.id,
      channel: "sse",
      limitPerMin: tenant.sseRateLimitPerMin,
      keySuffix: auth.apiKeyId,
    });

    if (!rl.allowed) {
      return Response.json(
        { error: "rate_limit_exceeded", channel: "sse" },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);

    const chainId = Number(searchParams.get("chainId") ?? "");
    const minScore = Number(searchParams.get("minScore") ?? "0");
    const type = parseIncidentType(searchParams.get("type"));
    const status = parseStatus(searchParams.get("status"));
    const lifecycleState = parseLifecycle(searchParams.get("lifecycleState"));
    const projectKey = searchParams.get("projectKey")?.trim() || undefined;
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 25)));
    const pollMs = Math.min(30_000, Math.max(1000, Number(searchParams.get("pollMs") ?? 3000)));

    const tenantChains = await listTenantChains(tenant);
    if (Number.isFinite(chainId) && tenant.allowedChains.length > 0 && !tenantChains.includes(chainId)) {
      return Response.json({ error: "forbidden_chain" }, { status: 403 });
    }

    const allowedChains = Number.isFinite(chainId)
      ? [chainId]
      : tenantChains;

    const updatedAfterParam = searchParams.get("updatedAfter") ?? searchParams.get("cursor");
    let cursor = updatedAfterParam ? new Date(updatedAfterParam) : new Date(Date.now() - 60_000);
    if (Number.isNaN(cursor.getTime())) {
      cursor = new Date(Date.now() - 60_000);
    }

    const encoder = new TextEncoder();
    let timer: ReturnType<typeof setInterval> | undefined;
    let closed = false;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (event: string, payload: unknown) => {
          if (closed) return;
          controller.enqueue(encoder.encode(encodeSse(event, payload)));
        };

        const tick = async () => {
          if (closed) return;
          try {
            const items = await prisma.incident.findMany({
              where: {
                tenantId: tenant.id,
                chainId: { in: allowedChains },
                incidentType: {
                  in: [
                    IncidentType.WALLET_DRAIN,
                    IncidentType.PROTOCOL_EXPLOIT,
                    IncidentType.BRIDGE_EXPLOIT,
                  ],
                },
                ...(Number.isFinite(minScore) && minScore > 0
                  ? { score: { gte: minScore } }
                  : {}),
                ...(type ? { incidentType: type } : {}),
                ...(status ? { status } : {}),
                ...(lifecycleState ? { lifecycleState } : {}),
                ...(projectKey ? { projectKey } : {}),
                updatedAt: { gt: cursor },
              },
              orderBy: { updatedAt: "asc" },
              take: limit,
            });

            if (items.length > 0) {
              cursor = items[items.length - 1]!.updatedAt;
              send("incidents", {
                cursor: cursor.toISOString(),
                items: items.map(toStreamItem),
              });
            } else {
              send("ping", { cursor: cursor.toISOString(), ts: new Date().toISOString() });
            }
          } catch (err) {
            send("error", { message: String(err) });
          }
        };

        send("ready", {
          tenantId: tenant.id,
          pollMs,
          cursor: cursor.toISOString(),
          remainingThisMinute: rl.remaining,
        });

        void tick();
        timer = setInterval(() => {
          void tick();
        }, pollMs);

        const onAbort = () => {
          if (closed) return;
          closed = true;
          if (timer) clearInterval(timer);
          controller.close();
        };

        request.signal.addEventListener("abort", onAbort, { once: true });
      },
      cancel() {
        closed = true;
        if (timer) clearInterval(timer);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    const message = String(err);
    const status = message.includes("api_key") ? 401 : 500;
    return Response.json({ error: "failed_to_open_stream", detail: message }, { status });
  }
}
