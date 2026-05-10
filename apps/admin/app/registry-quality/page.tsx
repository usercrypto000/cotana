import { isAdminUser } from "@cotana/auth";
import {
  getAgentCapabilityQualityDistribution,
  listAgentRegistryCapabilityTypes,
  listAgentRegistryCategories,
  listAgentRegistryEvaluationLogs,
  listAgentRegistryIntentTestRuns
} from "@cotana/db";
import type { AgentRegistryReadinessBucket } from "@cotana/types";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@cotana/ui";
import { AdminAuthGate } from "../../components/admin-auth-gate";
import { AdminShell } from "../../components/admin-shell";
import { getSessionUser } from "../../lib/session";

export const dynamic = "force-dynamic";

type RegistryQualityPageProps = {
  searchParams: Promise<{
    category?: string;
    capabilityType?: string;
    readinessBucket?: AgentRegistryReadinessBucket;
    from?: string;
    to?: string;
  }>;
};

const readinessBuckets: AgentRegistryReadinessBucket[] = [
  "ready",
  "needs_metadata",
  "missing_schema",
  "missing_safety_notes",
  "weak_docs",
  "low_reliability",
  "unsafe_interaction_mode"
];

function parseDateParam(value?: string, endOfDay = false) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatBucket(value: string) {
  return value.replace(/_/g, " ");
}

export default async function RegistryQualityPage({ searchParams }: RegistryQualityPageProps) {
  const sessionUser = await getSessionUser();
  const params = await searchParams;

  if (!isAdminUser(sessionUser)) {
    return (
      <AdminShell
        title="Registry quality"
        description="Admin-only inspection for discovery quality signals."
      >
        <AdminAuthGate />
      </AdminShell>
    );
  }

  const selectedCategory = params.category ?? "";
  const selectedCapabilityType = params.capabilityType ?? "";
  const selectedReadinessBucket = params.readinessBucket ?? "";
  const from = parseDateParam(params.from);
  const to = parseDateParam(params.to, true);
  const [categories, capabilityTypes, distribution, evaluationLogs, intentRuns] = await Promise.all([
    listAgentRegistryCategories(),
    listAgentRegistryCapabilityTypes(),
    getAgentCapabilityQualityDistribution(),
    listAgentRegistryEvaluationLogs({
      limit: 40,
      categorySlug: selectedCategory || null,
      capabilityType: selectedCapabilityType || null,
      readinessBucket: selectedReadinessBucket ? (selectedReadinessBucket as AgentRegistryReadinessBucket) : null,
      from,
      to
    }),
    listAgentRegistryIntentTestRuns(12)
  ]);

  return (
    <AdminShell
      title="Registry quality"
      description="Compact inspection for agent registry evaluations, intent-test history, and capability readiness."
    >
      <section className="grid gap-3 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Capability distribution</CardTitle>
            <p className="text-sm text-slate-500">{distribution.totalCapabilities} active capabilities inspected.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(distribution.gradeCounts).map(([grade, count]) => (
                <div key={grade} className="rounded-xl border bg-slate-50 p-3">
                  <p className="text-xs uppercase text-slate-500">{formatBucket(grade)}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{count}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(distribution.readinessBucketCounts).map(([bucket, count]) => (
                <Badge key={bucket} variant={bucket === "ready" ? "ready" : "warning"}>
                  {count} {formatBucket(bucket)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribution matrix</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {distribution.matrix.map((entry) => (
              <div key={`${entry.grade}-${entry.readinessBucket}`} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                <span className="text-slate-600">
                  {formatBucket(entry.grade)} / {formatBucket(entry.readinessBucket)}
                </span>
                <span className="font-semibold text-slate-950">{entry.count}</span>
              </div>
            ))}
            {distribution.matrix.length === 0 ? (
              <p className="text-sm text-slate-500">No capability quality signals are available yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-brand-text">Registry evaluation logs</h2>
          <p className="text-sm text-neutral-muted">Filter recent public registry searches by operational quality dimensions.</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <form className="grid gap-3 md:grid-cols-6">
              <label className="space-y-1 text-sm text-slate-600">
                <span>Category</span>
                <select name="category" defaultValue={selectedCategory} className="w-full rounded-xl border px-3 py-2">
                  <option value="">All</option>
                  {categories.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm text-slate-600">
                <span>Capability</span>
                <select name="capabilityType" defaultValue={selectedCapabilityType} className="w-full rounded-xl border px-3 py-2">
                  <option value="">All</option>
                  {capabilityTypes.map((type) => (
                    <option key={type.capabilityType} value={type.capabilityType}>
                      {type.capabilityType}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm text-slate-600">
                <span>Bucket</span>
                <select name="readinessBucket" defaultValue={selectedReadinessBucket} className="w-full rounded-xl border px-3 py-2">
                  <option value="">All</option>
                  {readinessBuckets.map((bucket) => (
                    <option key={bucket} value={bucket}>
                      {formatBucket(bucket)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm text-slate-600">
                <span>From</span>
                <input name="from" type="date" defaultValue={params.from ?? ""} className="w-full rounded-xl border px-3 py-2" />
              </label>
              <label className="space-y-1 text-sm text-slate-600">
                <span>To</span>
                <input name="to" type="date" defaultValue={params.to ?? ""} className="w-full rounded-xl border px-3 py-2" />
              </label>
              <div className="flex items-end gap-2">
                <Button type="submit" className="w-full">Apply</Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <div className="grid gap-3">
          {evaluationLogs.map((log) => (
            <Card key={log.id}>
              <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">{log.query}</p>
                    {log.topCategorySlug ? <Badge variant="secondary">{log.topCategorySlug}</Badge> : null}
                    {log.topCapabilityType ? <Badge variant="secondary">{log.topCapabilityType}</Badge> : null}
                    {log.topReadinessBucket ? <Badge variant={log.topReadinessBucket === "ready" ? "ready" : "warning"}>{formatBucket(log.topReadinessBucket)}</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {new Date(log.createdAt).toLocaleString()} · {log.resultCount} results · {log.candidateCount} candidates
                  </p>
                  <p className="mt-2 text-sm text-slate-600">{log.topMatchReason ?? "No top match recorded."}</p>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {typeof log.topScore === "number" ? <Badge variant="secondary">Score {log.topScore.toFixed(3)}</Badge> : null}
                  {typeof log.topQualityScore === "number" ? <Badge variant="secondary">Quality {log.topQualityScore}/100</Badge> : null}
                  <Badge variant={log.blockingIssueCount > 0 ? "warning" : "ready"}>{log.blockingIssueCount} excluded</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {evaluationLogs.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-slate-500">No registry evaluation logs match these filters.</CardContent>
            </Card>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-brand-text">Intent test history</h2>
          <p className="text-sm text-neutral-muted">Most recent seeded test runs persisted from ConfigKV-backed definitions.</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {intentRuns.map((run) => (
            <Card key={run.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{run.query}</p>
                    <p className="text-sm text-slate-500">{new Date(run.ranAt).toLocaleString()}</p>
                  </div>
                  <Badge variant={run.passed ? "ready" : "warning"}>{run.passed ? "Pass" : "Inspect"}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Expected {run.expectedCategorySlug ?? "all categories"}</Badge>
                  <Badge variant="secondary">App {run.topMatchedAppSlug ?? "none"}</Badge>
                  <Badge variant="secondary">Capability {run.topMatchedCapabilitySlug ?? "none"}</Badge>
                  {typeof run.score === "number" ? <Badge variant="secondary">Score {run.score.toFixed(3)}</Badge> : null}
                </div>
                <p className="text-sm text-slate-600">{run.failureReason ?? run.matchReason ?? "No match reason recorded."}</p>
              </CardContent>
            </Card>
          ))}
          {intentRuns.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-slate-500">Intent test run history will appear after the suite runs.</CardContent>
            </Card>
          ) : null}
        </div>
      </section>
    </AdminShell>
  );
}
