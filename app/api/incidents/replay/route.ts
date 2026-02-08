import { prisma } from "@/services/prisma";
import { runIncidentReplayJob } from "@/services/exploit-tracker/replay";
import { logIncidentAudit } from "@/services/exploit-tracker/audit";
import { requireTenantAuth } from "@/services/exploit-tracker/tenant-auth";

type ReplayBody = {
  lookbackHours?: number;
  chainId?: number;
  ruleVersion?: string;
  sendAlerts?: boolean;
  whatIf?: boolean;
};

function parseChainId(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export async function GET(request: Request) {
  try {
    const auth = await requireTenantAuth(request, true);
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));

    const jobs = await prisma.replayJob.findMany({
      where: { tenantId: auth.tenant.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return Response.json({
      items: jobs.map((job) => ({
        ...job,
        id: job.id.toString(),
      })),
    });
  } catch (err) {
    const message = String(err);
    const status = message.includes("api_key") ? 401 : 500;
    return Response.json(
      { error: "failed_to_list_replay_jobs", detail: message },
      { status }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireTenantAuth(request, true);
    const body = (await request.json()) as ReplayBody;

    const lookbackHours = Math.max(1, Math.min(168, Math.floor(Number(body.lookbackHours ?? 6))));
    const chainId = parseChainId(body.chainId);

    if (chainId && auth.tenant.allowedChains.length > 0 && !auth.tenant.allowedChains.includes(chainId)) {
      return Response.json({ error: "forbidden_chain" }, { status: 403 });
    }

    const result = await runIncidentReplayJob({
      tenant: auth.tenant,
      lookbackHours,
      chainId,
      ruleVersion: body.ruleVersion,
      requestedBy: `apiKey:${auth.apiKeyId}`,
      sendAlerts: Boolean(body.sendAlerts),
      whatIf: Boolean(body.whatIf),
    });

    await logIncidentAudit({
      tenantId: auth.tenant.id,
      incidentId: null,
      actor: `apiKey:${auth.apiKeyId}`,
      action: body.whatIf ? "replay.what_if" : "replay.run",
      detail: {
        lookbackHours,
        chainId: chainId ?? null,
        ruleVersion: body.ruleVersion ?? null,
        sendAlerts: Boolean(body.sendAlerts),
      },
    });

    return Response.json({
      item: {
        ...result,
        jobId: result.jobId.toString(),
      },
    });
  } catch (err) {
    const message = String(err);
    const status = message.includes("api_key")
      ? 401
      : message.includes("no_allowed_chains")
      ? 400
      : 500;
    return Response.json(
      { error: "failed_to_run_replay", detail: message },
      { status }
    );
  }
}
