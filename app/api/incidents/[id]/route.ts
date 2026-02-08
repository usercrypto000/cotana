import crypto from "node:crypto";
import {
  IncidentLifecycleState,
  IncidentRelationType,
  IncidentStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/services/prisma";
import {
  actorFromRequestHeaders,
  logIncidentAudit,
} from "@/services/exploit-tracker/audit";
import { snapshotIncidentLifecycle } from "@/services/exploit-tracker/lifecycle";
import { requireTenantAuth } from "@/services/exploit-tracker/tenant-auth";

type Params = { params: { id: string } | Promise<{ id: string }> };

type PatchBody = {
  status?: string;
  lifecycleState?: string;
  action?:
    | "merge"
    | "split"
    | "force_merge"
    | "force_split"
    | "mark_false_positive"
    | "lock"
    | "unlock";
  targetIncidentId?: string;
  attackerAddresses?: string[];
  victimAddresses?: string[];
  affectedContracts?: string[];
  topTxHashes?: string[];
  summary?: string;
  reason?: string;
  lockReason?: string;
  publicVisible?: boolean;
};

function parseLifecycle(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === "OPEN") return IncidentLifecycleState.OPEN;
  if (normalized === "EXPANDING") return IncidentLifecycleState.EXPANDING;
  if (normalized === "CONTAINED") return IncidentLifecycleState.CONTAINED;
  if (normalized === "RESOLVED") return IncidentLifecycleState.RESOLVED;
  if (normalized === "FALSE_POSITIVE") return IncidentLifecycleState.FALSE_POSITIVE;
  return null;
}

function parseStatus(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === "OPEN") return IncidentStatus.OPEN;
  if (normalized === "MONITORING") return IncidentStatus.MONITORING;
  if (normalized === "RESOLVED") return IncidentStatus.RESOLVED;
  return null;
}

function statusFromLifecycle(lifecycleState: IncidentLifecycleState): IncidentStatus {
  if (
    lifecycleState === IncidentLifecycleState.RESOLVED ||
    lifecycleState === IncidentLifecycleState.FALSE_POSITIVE
  ) {
    return IncidentStatus.RESOLVED;
  }
  if (lifecycleState === IncidentLifecycleState.OPEN) return IncidentStatus.OPEN;
  return IncidentStatus.MONITORING;
}

function toItem(item: any) {
  return {
    ...item,
    id: item.id.toString(),
    peakLossUsd: String(item.peakLossUsd ?? "0"),
    exploitConfidence: String(item.exploitConfidence ?? "0"),
    estimatedTotalLossUsd:
      item.estimatedTotalLossUsd === null ? null : String(item.estimatedTotalLossUsd),
    confidenceDecayRate: String(item.confidenceDecayRate ?? "0"),
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
    fundFlowPaths: item.fundFlowPaths.map((path: any) => ({
      ...path,
      id: path.id.toString(),
      incidentId: path.incidentId.toString(),
      totalInputUsd: path.totalInputUsd === null ? null : String(path.totalInputUsd),
      totalOutputUsd: path.totalOutputUsd === null ? null : String(path.totalOutputUsd),
      conservationRatio:
        path.conservationRatio === null ? null : String(path.conservationRatio),
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
    lifecycleSnapshots: item.lifecycleSnapshots.map((snap: any) => ({
      ...snap,
      id: snap.id.toString(),
      incidentId: snap.incidentId.toString(),
      confidence: String(snap.confidence ?? "0"),
      estimatedLossUsd:
        snap.estimatedLossUsd === null ? null : String(snap.estimatedLossUsd),
    })),
    auditLogs: item.auditLogs.map((log: any) => ({
      ...log,
      id: log.id.toString(),
      incidentId: log.incidentId ? log.incidentId.toString() : null,
    })),
    outgoingRelations: item.outgoingRelations.map((rel: any) => ({
      ...rel,
      id: rel.id.toString(),
      fromIncidentId: rel.fromIncidentId.toString(),
      toIncidentId: rel.toIncidentId.toString(),
    })),
    incomingRelations: item.incomingRelations.map((rel: any) => ({
      ...rel,
      id: rel.id.toString(),
      fromIncidentId: rel.fromIncidentId.toString(),
      toIncidentId: rel.toIncidentId.toString(),
    })),
  };
}

async function getScopedIncident(tenantId: number, id: bigint) {
  return prisma.incident.findFirst({
    where: { id, tenantId },
    include: {
      ruleHits: { orderBy: { createdAt: "desc" }, take: 200 },
      cashoutPaths: { orderBy: { createdAt: "desc" }, take: 30 },
      fundFlowPaths: { orderBy: { createdAt: "desc" }, take: 100 },
      lifecycleSnapshots: { orderBy: { createdAt: "desc" }, take: 120 },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 120 },
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
      },
      outgoingRelations: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      incomingRelations: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
}

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

    const incident = await getScopedIncident(auth.tenant.id, id);

    if (!incident) {
      return Response.json({ error: "incident_not_found" }, { status: 404 });
    }

    return Response.json({ item: toItem(incident) });
  } catch (err) {
    const message = String(err);
    const status = message.includes("api_key") ? 401 : 500;
    return Response.json(
      { error: "failed_to_get_incident", detail: message },
      { status }
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const auth = await requireTenantAuth(request, true);
    const actor = actorFromRequestHeaders(request, `apiKey:${auth.apiKeyId}`);

    const resolved = await Promise.resolve(params);
    let id: bigint;
    try {
      id = BigInt(resolved.id);
    } catch {
      return Response.json({ error: "invalid_incident_id" }, { status: 400 });
    }

    const body = (await request.json()) as PatchBody;
    const forceAction = body.action === "force_merge" || body.action === "force_split";
    const action =
      body.action === "force_merge"
        ? "merge"
        : body.action === "force_split"
        ? "split"
        : body.action;

    const incident = await prisma.incident.findFirst({
      where: { id, tenantId: auth.tenant.id },
    });

    if (!incident) {
      return Response.json({ error: "incident_not_found" }, { status: 404 });
    }

    if (incident.lockedAt && !forceAction && action !== "unlock" && action !== "lock") {
      return Response.json({ error: "incident_locked" }, { status: 409 });
    }

    if (action === "lock") {
      const updated = await prisma.incident.update({
        where: { id: incident.id },
        data: {
          lockedAt: new Date(),
          lockedBy: actor,
          lockReason: body.lockReason?.trim() || body.reason?.trim() || "manual_lock",
        },
      });

      await logIncidentAudit({
        tenantId: auth.tenant.id,
        incidentId: incident.id,
        actor,
        action: "incident.lock",
        detail: { reason: updated.lockReason ?? null },
      });

      const item = await getScopedIncident(auth.tenant.id, updated.id);
      return Response.json({ item: item ? toItem(item) : null });
    }

    if (action === "unlock") {
      const updated = await prisma.incident.update({
        where: { id: incident.id },
        data: {
          lockedAt: null,
          lockedBy: null,
          lockReason: null,
        },
      });

      await logIncidentAudit({
        tenantId: auth.tenant.id,
        incidentId: incident.id,
        actor,
        action: "incident.unlock",
      });

      const item = await getScopedIncident(auth.tenant.id, updated.id);
      return Response.json({ item: item ? toItem(item) : null });
    }

    if (action === "mark_false_positive") {
      const now = new Date();
      const updated = await prisma.incident.update({
        where: { id: incident.id },
        data: {
          lifecycleState: IncidentLifecycleState.FALSE_POSITIVE,
          status: IncidentStatus.RESOLVED,
          resolvedAt: incident.resolvedAt ?? now,
          lastActivityAt: now,
        },
      });

      await snapshotIncidentLifecycle({
        incidentId: incident.id,
        fromState: incident.lifecycleState,
        toState: IncidentLifecycleState.FALSE_POSITIVE,
        reason: body.reason?.trim() || "manual_false_positive",
        score: updated.score,
        confidence: Number(updated.exploitConfidence ?? 0),
        estimatedLossUsd: Number(updated.estimatedTotalLossUsd ?? 0),
      });

      await logIncidentAudit({
        tenantId: auth.tenant.id,
        incidentId: incident.id,
        actor,
        action: "incident.mark_false_positive",
        detail: { reason: body.reason?.trim() || null },
      });

      const item = await getScopedIncident(auth.tenant.id, updated.id);
      return Response.json({ item: item ? toItem(item) : null });
    }

    if (action === "merge") {
      let targetId: bigint;
      try {
        targetId = BigInt(body.targetIncidentId ?? "");
      } catch {
        return Response.json({ error: "invalid_target_incident_id" }, { status: 400 });
      }

      if (targetId === incident.id) {
        return Response.json({ error: "cannot_merge_self" }, { status: 400 });
      }

      const target = await prisma.incident.findFirst({
        where: { id: targetId, tenantId: auth.tenant.id },
      });

      if (!target) {
        return Response.json({ error: "target_incident_not_found" }, { status: 404 });
      }

      const now = new Date();
      const mergedContracts = Array.from(new Set([...target.affectedContracts, ...incident.affectedContracts]));
      const mergedAttackers = Array.from(new Set([...target.attackerAddresses, ...incident.attackerAddresses]));
      const mergedVictims = Array.from(new Set([...target.victimAddresses, ...incident.victimAddresses]));
      const mergedTx = Array.from(new Set([...target.topTxHashes, ...incident.topTxHashes])).slice(0, 40);
      const mergedVectors = Array.from(new Set([...target.exploitVectors, ...incident.exploitVectors]));

      await prisma.$transaction([
        prisma.incidentRelation.upsert({
          where: {
            fromIncidentId_toIncidentId_relationType: {
              fromIncidentId: incident.id,
              toIncidentId: target.id,
              relationType: IncidentRelationType.MERGED,
            },
          },
          create: {
            fromIncidentId: incident.id,
            toIncidentId: target.id,
            relationType: IncidentRelationType.MERGED,
          },
          update: {},
        }),
        prisma.incident.update({
          where: { id: target.id },
          data: {
            score: Math.max(target.score, incident.score),
            exploitConfidence: {
              set: target.exploitConfidence.gte(incident.exploitConfidence)
                ? target.exploitConfidence
                : incident.exploitConfidence,
            },
            estimatedTotalLossUsd: {
              set:
                target.estimatedTotalLossUsd && incident.estimatedTotalLossUsd
                  ? target.estimatedTotalLossUsd.gte(incident.estimatedTotalLossUsd)
                    ? target.estimatedTotalLossUsd
                    : incident.estimatedTotalLossUsd
                  : target.estimatedTotalLossUsd ?? incident.estimatedTotalLossUsd,
            },
            peakLossUsd: {
              set: target.peakLossUsd.gte(incident.peakLossUsd)
                ? target.peakLossUsd
                : incident.peakLossUsd,
            },
            affectedContracts: { set: mergedContracts },
            attackerAddresses: { set: mergedAttackers },
            victimAddresses: { set: mergedVictims },
            topTxHashes: { set: mergedTx },
            exploitVectors: { set: mergedVectors },
            lifecycleState: IncidentLifecycleState.EXPANDING,
            status: IncidentStatus.MONITORING,
            lastActivityAt: now,
          },
        }),
        prisma.incident.update({
          where: { id: incident.id },
          data: {
            lifecycleState: IncidentLifecycleState.RESOLVED,
            status: IncidentStatus.RESOLVED,
            resolvedAt: now,
            lastActivityAt: now,
          },
        }),
      ]);

      await snapshotIncidentLifecycle({
        incidentId: incident.id,
        fromState: incident.lifecycleState,
        toState: IncidentLifecycleState.RESOLVED,
        reason: `merged_into:${target.id.toString()}`,
        score: incident.score,
        confidence: Number(incident.exploitConfidence ?? 0),
        estimatedLossUsd: Number(incident.estimatedTotalLossUsd ?? 0),
      });
      await snapshotIncidentLifecycle({
        incidentId: target.id,
        fromState: target.lifecycleState,
        toState: IncidentLifecycleState.EXPANDING,
        reason: `merged_from:${incident.id.toString()}`,
        score: Math.max(target.score, incident.score),
        confidence: Number(
          target.exploitConfidence.gte(incident.exploitConfidence)
            ? target.exploitConfidence
            : incident.exploitConfidence
        ),
        estimatedLossUsd: Math.max(
          Number(target.estimatedTotalLossUsd ?? 0),
          Number(incident.estimatedTotalLossUsd ?? 0)
        ),
      });

      await logIncidentAudit({
        tenantId: auth.tenant.id,
        incidentId: incident.id,
        actor,
        action: "incident.merge",
        detail: { targetIncidentId: target.id.toString() },
      });

      const item = await getScopedIncident(auth.tenant.id, target.id);
      return Response.json({ item: item ? toItem(item) : null });
    }

    if (action === "split") {
      const now = new Date();
      let targetId: bigint | null = null;

      if (body.targetIncidentId) {
        try {
          targetId = BigInt(body.targetIncidentId);
        } catch {
          return Response.json({ error: "invalid_target_incident_id" }, { status: 400 });
        }
      }

      let splitIncidentId: bigint;
      let createdSplit = false;
      if (targetId) {
        const target = await prisma.incident.findFirst({
          where: { id: targetId, tenantId: auth.tenant.id },
        });
        if (!target) {
          return Response.json({ error: "target_incident_not_found" }, { status: 404 });
        }
        splitIncidentId = target.id;
      } else {
        const attackerAddresses =
          body.attackerAddresses && body.attackerAddresses.length > 0
            ? body.attackerAddresses
            : incident.attackerAddresses;
        const victimAddresses =
          body.victimAddresses && body.victimAddresses.length > 0
            ? body.victimAddresses
            : incident.victimAddresses;
        const affectedContracts =
          body.affectedContracts && body.affectedContracts.length > 0
            ? body.affectedContracts
            : incident.affectedContracts;
        const topTxHashes =
          body.topTxHashes && body.topTxHashes.length > 0
            ? body.topTxHashes
            : incident.topTxHashes;

        const dedupeKey = crypto
          .createHash("sha256")
          .update(`${incident.dedupeKey}:split:${Date.now()}:${topTxHashes.join(",")}`)
          .digest("hex");

        const created = await prisma.incident.create({
          data: {
            tenantId: incident.tenantId,
            incidentType: incident.incidentType,
            status: IncidentStatus.OPEN,
            lifecycleState: IncidentLifecycleState.OPEN,
            chainId: incident.chainId,
            rootKey: `${incident.rootKey}:split:${Date.now()}`,
            dedupeKey,
            ruleVersion: incident.ruleVersion,
            projectKey: incident.projectKey,
            score: Math.max(1, Math.floor(incident.score * 0.8)),
            exploitConfidence: incident.exploitConfidence,
            confidenceOverTime:
              incident.confidenceOverTime === null
                ? undefined
                : (incident.confidenceOverTime as Prisma.InputJsonValue),
            estimatedTotalLossUsd: incident.estimatedTotalLossUsd,
            peakLossUsd: incident.peakLossUsd,
            affectedContracts,
            attackerAddresses,
            victimAddresses,
            topTxHashes,
            exploitVectors: incident.exploitVectors,
            ruleSummary: body.summary ?? `Split from incident ${incident.id.toString()}`,
            startedAt: now,
            lastActivityAt: now,
            lastAlertScore: 0,
          },
        });

        splitIncidentId = created.id;
        createdSplit = true;
      }

      await prisma.$transaction([
        prisma.incidentRelation.upsert({
          where: {
            fromIncidentId_toIncidentId_relationType: {
              fromIncidentId: incident.id,
              toIncidentId: splitIncidentId,
              relationType: IncidentRelationType.SPLIT,
            },
          },
          create: {
            fromIncidentId: incident.id,
            toIncidentId: splitIncidentId,
            relationType: IncidentRelationType.SPLIT,
          },
          update: {},
        }),
        prisma.incident.update({
          where: { id: incident.id },
          data: {
            lifecycleState: IncidentLifecycleState.CONTAINED,
            status: IncidentStatus.MONITORING,
            lastActivityAt: now,
          },
        }),
      ]);

      await snapshotIncidentLifecycle({
        incidentId: incident.id,
        fromState: incident.lifecycleState,
        toState: IncidentLifecycleState.CONTAINED,
        reason: `split_to:${splitIncidentId.toString()}`,
        score: incident.score,
        confidence: Number(incident.exploitConfidence ?? 0),
        estimatedLossUsd: Number(incident.estimatedTotalLossUsd ?? 0),
      });
      if (createdSplit) {
        const splitIncident = await prisma.incident.findUnique({ where: { id: splitIncidentId } });
        if (splitIncident) {
          await snapshotIncidentLifecycle({
            incidentId: splitIncident.id,
            fromState: null,
            toState: IncidentLifecycleState.OPEN,
            reason: `split_from:${incident.id.toString()}`,
            score: splitIncident.score,
            confidence: Number(splitIncident.exploitConfidence ?? 0),
            estimatedLossUsd: Number(splitIncident.estimatedTotalLossUsd ?? 0),
          });
        }
      }

      await logIncidentAudit({
        tenantId: auth.tenant.id,
        incidentId: incident.id,
        actor,
        action: "incident.split",
        detail: { splitIncidentId: splitIncidentId.toString() },
      });

      const item = await getScopedIncident(auth.tenant.id, splitIncidentId);
      return Response.json({ item: item ? toItem(item) : null });
    }

    const lifecycleState = parseLifecycle(body.lifecycleState ?? null);
    const status = parseStatus(body.status ?? null);

    if (!lifecycleState && !status && body.publicVisible === undefined) {
      return Response.json({ error: "invalid_patch_body" }, { status: 400 });
    }

    const nextLifecycle = lifecycleState ?? incident.lifecycleState;
    const nextStatus = status ?? statusFromLifecycle(nextLifecycle);

    const updated = await prisma.incident.update({
      where: { id: incident.id },
      data: {
        lifecycleState: nextLifecycle,
        status: nextStatus,
        publicVisible:
          body.publicVisible === undefined ? incident.publicVisible : Boolean(body.publicVisible),
        resolvedAt:
          nextLifecycle === IncidentLifecycleState.RESOLVED ||
          nextLifecycle === IncidentLifecycleState.FALSE_POSITIVE
            ? incident.resolvedAt ?? new Date()
            : null,
        lastActivityAt: new Date(),
      },
    });

    if (nextLifecycle !== incident.lifecycleState) {
      await snapshotIncidentLifecycle({
        incidentId: incident.id,
        fromState: incident.lifecycleState,
        toState: nextLifecycle,
        reason: body.reason?.trim() || "manual_transition",
        score: updated.score,
        confidence: Number(updated.exploitConfidence ?? 0),
        estimatedLossUsd: Number(updated.estimatedTotalLossUsd ?? 0),
      });
    }

    await logIncidentAudit({
      tenantId: auth.tenant.id,
      incidentId: incident.id,
      actor,
      action: "incident.update",
      detail: {
        lifecycleState: nextLifecycle,
        status: nextStatus,
        publicVisible: updated.publicVisible,
      } as Prisma.InputJsonValue,
    });

    const item = await getScopedIncident(auth.tenant.id, updated.id);
    return Response.json({ item: item ? toItem(item) : null });
  } catch (err) {
    const message = String(err);
    const status = message.includes("api_key") ? 401 : 500;
    return Response.json(
      { error: "failed_to_update_incident", detail: message },
      { status }
    );
  }
}
