import { requireTenantAuth } from "@/services/exploit-tracker/tenant-auth";
import {
  loadTenantRuleControls,
  upsertTenantRuleControl,
} from "@/services/exploit-tracker/rule-controls";
import { actorFromRequestHeaders, logIncidentAudit } from "@/services/exploit-tracker/audit";

type RuleControlInput = {
  ruleId: string;
  minScore?: number | null;
  weight?: number | null;
  suppressed?: boolean;
  notes?: string | null;
};

type PatchBody = {
  items?: RuleControlInput[];
  item?: RuleControlInput;
};

export async function GET(request: Request) {
  try {
    const auth = await requireTenantAuth(request, true);
    const controls = await loadTenantRuleControls(auth.tenant.id);

    return Response.json({
      items: Array.from(controls.values()).sort((a, b) => a.ruleId.localeCompare(b.ruleId)),
    });
  } catch (err) {
    const message = String(err);
    const status = message.includes("api_key") ? 401 : 500;
    return Response.json({ error: "failed_to_list_rule_controls", detail: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireTenantAuth(request, true);
    const actor = actorFromRequestHeaders(request, `apiKey:${auth.apiKeyId}`);
    const body = (await request.json()) as PatchBody;

    const items = body.items ?? (body.item ? [body.item] : []);
    if (items.length === 0) {
      return Response.json({ error: "missing_items" }, { status: 400 });
    }

    const updated = [];
    for (const item of items) {
      const ruleId = item.ruleId?.trim();
      if (!ruleId) continue;
      const row = await upsertTenantRuleControl({
        tenantId: auth.tenant.id,
        ruleId,
        minScore: item.minScore,
        weight: item.weight,
        suppressed: item.suppressed,
        notes: item.notes,
      });
      updated.push({
        ruleId: row.ruleId,
        minScore: row.minScore,
        weight: Number(row.weight),
        suppressed: row.suppressed,
        notes: row.notes,
      });
    }

    await logIncidentAudit({
      tenantId: auth.tenant.id,
      incidentId: null,
      actor,
      action: "rules.update",
      detail: { count: updated.length },
    });

    return Response.json({ items: updated });
  } catch (err) {
    const message = String(err);
    const status = message.includes("api_key") ? 401 : 500;
    return Response.json({ error: "failed_to_update_rule_controls", detail: message }, { status });
  }
}
