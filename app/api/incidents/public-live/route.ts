import { IncidentLifecycleState } from "@prisma/client";
import { prisma } from "@/services/prisma";

function redactAddress(value: string) {
  if (!value || value.length < 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 25)));

    const items = await prisma.incident.findMany({
      where: {
        publicVisible: true,
        lifecycleState: {
          in: [
            IncidentLifecycleState.OPEN,
            IncidentLifecycleState.EXPANDING,
            IncidentLifecycleState.CONTAINED,
          ],
        },
        tenant: {
          publicFeedEnabled: true,
        },
      },
      include: {
        tenant: {
          select: {
            slug: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    return Response.json({
      schemaVersion: "2026-02-06.1",
      items: items.map((item) => ({
        incidentId: item.id.toString(),
        tenant: item.tenant.slug,
        type: item.incidentType,
        lifecycleState: item.lifecycleState,
        score: item.score,
        confidence: Number(item.exploitConfidence ?? 0),
        estimatedLossUsd: Number(item.estimatedTotalLossUsd ?? 0),
        peakLossUsd: Number(item.peakLossUsd ?? 0),
        attackerCount: item.attackerAddresses.length,
        contractCount: item.affectedContracts.length,
        attackers: item.attackerAddresses.slice(0, 3).map(redactAddress),
        contracts: item.affectedContracts.slice(0, 3).map(redactAddress),
        txHashes: item.topTxHashes.slice(0, 3).map(redactAddress),
        updatedAt: item.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    return Response.json(
      { error: "failed_to_load_public_live", detail: String(err) },
      { status: 500 }
    );
  }
}
