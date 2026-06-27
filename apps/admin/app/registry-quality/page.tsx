import { isAdminUser } from "@cotana/auth";
import {
  compareLatestAgentRegistryIntentTestRuns,
  getAgentCapabilityQualityDistribution,
  getAgentRegistryHealthExport,
  listCapabilityQualityTrend,
  listMissingMetadataTrend,
  listAgentRegistryChangeLogs,
  listAgentRegistryCapabilityTypes,
  listAgentRegistryCategories,
  listAgentRegistryEvaluationLogs,
  listAgentRegistryIntentTestRuns
} from "@cotana/db";
import type { AgentAuthType, AgentInteractionMode, AgentInterfaceType, AgentRegistryReadinessBucket } from "@cotana/types";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@cotana/ui";
import Link from "next/link";
import { AdminAuthGate } from "../../components/admin-auth-gate";
import { AdminShell } from "../../components/admin-shell";
import { getSessionUser } from "../../lib/session";
import { runRedTeamAgentIntentTestsAction, runSeededAgentIntentTestsAction } from "./actions";

export const dynamic = "force-dynamic";

type RegistryQualityPageProps = {
  searchParams: Promise<{
    category?: string;
    query?: string;
    capabilityType?: string;
    authType?: AgentAuthType;
    interfaceType?: AgentInterfaceType;
    interactionMode?: AgentInteractionMode;
    readinessBucket?: AgentRegistryReadinessBucket;
    matchedApp?: string;
    minBlockingIssueCount?: string;
    maxBlockingIssueCount?: string;
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
const authTypes: AgentAuthType[] = ["NONE", "API_KEY", "OAUTH2", "MCP", "CUSTOM"];
const interfaceTypes: AgentInterfaceType[] = ["HTTP_API", "MCP_SERVER", "SDK", "WEBHOOK", "DATA_FEED", "DOCS_ONLY"];
const interactionModes: AgentInteractionMode[] = ["READ_ONLY", "WRITE_ACTION", "TRANSACTIONAL", "HUMAN_HANDOFF"];

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
  const selectedQuery = params.query ?? "";
  const selectedCapabilityType = params.capabilityType ?? "";
  const selectedAuthType = params.authType ?? "";
  const selectedInterfaceType = params.interfaceType ?? "";
  const selectedInteractionMode = params.interactionMode ?? "";
  const selectedReadinessBucket = params.readinessBucket ?? "";
  const selectedMatchedApp = params.matchedApp ?? "";
  const minBlockingIssueCount = Number(params.minBlockingIssueCount);
  const maxBlockingIssueCount = Number(params.maxBlockingIssueCount);
  const from = parseDateParam(params.from);
  const to = parseDateParam(params.to, true);
  const [categories, capabilityTypes, distribution, evaluationLogs, intentRuns, regression, health, qualityTrend, metadataTrend, changeLogs] = await Promise.all([
    listAgentRegistryCategories(),
    listAgentRegistryCapabilityTypes(),
    getAgentCapabilityQualityDistribution(),
    listAgentRegistryEvaluationLogs({
      limit: 40,
      query: selectedQuery || null,
      categorySlug: selectedCategory || null,
      capabilityType: selectedCapabilityType || null,
      authType: selectedAuthType ? (selectedAuthType as AgentAuthType) : null,
      interfaceType: selectedInterfaceType ? (selectedInterfaceType as AgentInterfaceType) : null,
      interactionMode: selectedInteractionMode ? (selectedInteractionMode as AgentInteractionMode) : null,
      readinessBucket: selectedReadinessBucket ? (selectedReadinessBucket as AgentRegistryReadinessBucket) : null,
      matchedApp: selectedMatchedApp || null,
      minBlockingIssueCount: Number.isFinite(minBlockingIssueCount) ? minBlockingIssueCount : null,
      maxBlockingIssueCount: Number.isFinite(maxBlockingIssueCount) ? maxBlockingIssueCount : null,
      from,
      to
    }),
    listAgentRegistryIntentTestRuns(12),
    compareLatestAgentRegistryIntentTestRuns(),
    getAgentRegistryHealthExport(),
    listCapabilityQualityTrend(8),
    listMissingMetadataTrend(),
    listAgentRegistryChangeLogs(12)
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
            <p className="text-sm text-neutral-muted">{distribution.totalCapabilities} active capabilities inspected.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(distribution.gradeCounts).map(([grade, count]) => (
                <div key={grade} className="rounded-xl border bg-neutral-surface p-3">
                  <p className="text-xs uppercase text-neutral-muted">{formatBucket(grade)}</p>
                  <p className="mt-1 text-2xl font-semibold text-brand-text">{count}</p>
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
            <div className="grid gap-2 sm:grid-cols-3">
              {Object.entries(distribution.listingStatusCounts)
                .filter(([, count]) => count > 0)
                .map(([status, count]) => (
                  <div key={status} className="rounded-xl border bg-neutral-panel p-3">
                    <p className="text-xs uppercase text-neutral-muted">{formatBucket(status)}</p>
                    <p className="mt-1 text-xl font-semibold text-brand-text">{count}</p>
                  </div>
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
                <span className="text-brand-text/72">
                  {formatBucket(entry.grade)} / {formatBucket(entry.readinessBucket)}
                </span>
                <span className="font-semibold text-brand-text">{entry.count}</span>
              </div>
            ))}
            {distribution.matrix.length === 0 ? (
              <p className="text-sm text-neutral-muted">No capability quality signals are available yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Coverage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {Object.entries(distribution.capabilityTypeCounts).map(([type, count]) => (
                <Badge key={type} variant="agent">{count} {type}</Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(distribution.authTypeCounts).map(([type, count]) => (
                <Badge key={type} variant="secondary">{count} {type}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Interfaces</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {Object.entries(distribution.interfaceTypeCounts).map(([type, count]) => (
                <Badge key={type} variant="secondary">{count} {type}</Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(distribution.interactionModeCounts).map(([mode, count]) => (
                <Badge key={mode} variant={mode === "READ_ONLY" ? "ready" : "danger"}>{count} {mode}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Blocked publication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {distribution.nonReadOnlyCapabilities.slice(0, 5).map((entry) => (
              <div key={entry.capabilityId} className="rounded-xl border border-neutral-border p-3 text-sm">
                <p className="font-medium text-brand-text">{entry.appName}</p>
                <p className="text-neutral-muted">{entry.capabilityName} · {entry.interactionMode}</p>
              </div>
            ))}
            {distribution.nonReadOnlyCapabilities.length === 0 ? (
              <p className="text-sm text-neutral-muted">No non-read-only active capabilities found.</p>
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
              <label className="space-y-1 text-sm text-brand-text/72 md:col-span-2">
                <span>Query</span>
                <input name="query" defaultValue={selectedQuery} className="w-full rounded-xl border px-3 py-2" />
              </label>
              <label className="space-y-1 text-sm text-brand-text/72">
                <span>Matched app</span>
                <input name="matchedApp" defaultValue={selectedMatchedApp} className="w-full rounded-xl border px-3 py-2" />
              </label>
              <label className="space-y-1 text-sm text-brand-text/72">
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
              <label className="space-y-1 text-sm text-brand-text/72">
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
              <label className="space-y-1 text-sm text-brand-text/72">
                <span>Auth</span>
                <select name="authType" defaultValue={selectedAuthType} className="w-full rounded-xl border px-3 py-2">
                  <option value="">All</option>
                  {authTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-sm text-brand-text/72">
                <span>Interface</span>
                <select name="interfaceType" defaultValue={selectedInterfaceType} className="w-full rounded-xl border px-3 py-2">
                  <option value="">All</option>
                  {interfaceTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-sm text-brand-text/72">
                <span>Mode</span>
                <select name="interactionMode" defaultValue={selectedInteractionMode} className="w-full rounded-xl border px-3 py-2">
                  <option value="">All</option>
                  {interactionModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-sm text-brand-text/72">
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
              <label className="space-y-1 text-sm text-brand-text/72">
                <span>From</span>
                <input name="from" type="date" defaultValue={params.from ?? ""} className="w-full rounded-xl border px-3 py-2" />
              </label>
              <label className="space-y-1 text-sm text-brand-text/72">
                <span>To</span>
                <input name="to" type="date" defaultValue={params.to ?? ""} className="w-full rounded-xl border px-3 py-2" />
              </label>
              <label className="space-y-1 text-sm text-brand-text/72">
                <span>Min blocked</span>
                <input name="minBlockingIssueCount" type="number" min="0" defaultValue={params.minBlockingIssueCount ?? ""} className="w-full rounded-xl border px-3 py-2" />
              </label>
              <label className="space-y-1 text-sm text-brand-text/72">
                <span>Max blocked</span>
                <input name="maxBlockingIssueCount" type="number" min="0" defaultValue={params.maxBlockingIssueCount ?? ""} className="w-full rounded-xl border px-3 py-2" />
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
                    <p className="font-semibold text-brand-text">{log.query}</p>
                    {log.topCategorySlug ? <Badge variant="secondary">{log.topCategorySlug}</Badge> : null}
                    {log.topCapabilityType ? <Badge variant="secondary">{log.topCapabilityType}</Badge> : null}
                    {log.topReadinessBucket ? <Badge variant={log.topReadinessBucket === "ready" ? "ready" : "warning"}>{formatBucket(log.topReadinessBucket)}</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-neutral-muted">
                    {new Date(log.createdAt).toLocaleString()} · {log.resultCount} results · {log.candidateCount} candidates · {log.matchedCapabilityCount} matched
                  </p>
                  <p className="mt-2 text-sm text-brand-text/72">{log.topMatchReason ?? "No top match recorded."}</p>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Link href={`/registry-quality/evaluations/${log.id}`}>
                    <Badge variant="agent">Details</Badge>
                  </Link>
                  {log.topAppSlug ? <Badge variant="secondary">App {log.topAppSlug}</Badge> : null}
                  {typeof log.topScore === "number" ? <Badge variant="secondary">Score {log.topScore.toFixed(3)}</Badge> : null}
                  {typeof log.topQualityScore === "number" ? <Badge variant="secondary">Quality {log.topQualityScore}/100</Badge> : null}
                  <Badge variant={log.blockingIssueCount > 0 ? "warning" : "ready"}>{log.blockingIssueCount} excluded</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {evaluationLogs.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-neutral-muted">No registry evaluation logs match these filters.</CardContent>
            </Card>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-brand-text">Intent test history</h2>
          <p className="text-sm text-neutral-muted">Most recent seeded test runs persisted from ConfigKV-backed definitions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <form action={runSeededAgentIntentTestsAction}>
            <Button type="submit">Run seeded tests</Button>
          </form>
          <form action={runRedTeamAgentIntentTestsAction}>
            <Button type="submit" variant="secondary">Run red-team tests</Button>
          </form>
          <Badge variant="secondary">Latest {regression.latestVersion ?? "none"}</Badge>
          <Badge variant="secondary">Previous {regression.previousVersion ?? "none"}</Badge>
          <Badge variant={regression.newlyFailing.length > 0 ? "danger" : "ready"}>{regression.newlyFailing.length} newly failing</Badge>
          <Badge variant="ready">{regression.newlyPassing.length} newly passing</Badge>
          <Badge variant={regression.unchangedFailures.length > 0 ? "warning" : "secondary"}>{regression.unchangedFailures.length} unchanged failures</Badge>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {intentRuns.map((run) => (
            <Card key={run.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-text">{run.query}</p>
                    <p className="text-sm text-neutral-muted">{new Date(run.ranAt).toLocaleString()}</p>
                  </div>
                  <Badge variant={run.passed ? "ready" : "warning"}>{run.passed ? "Pass" : "Inspect"}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Expected {run.expectedCategorySlug ?? "all categories"}</Badge>
                  <Badge variant="secondary">App {run.topMatchedAppSlug ?? "none"}</Badge>
                  <Badge variant="secondary">Capability {run.topMatchedCapabilitySlug ?? "none"}</Badge>
                  {typeof run.score === "number" ? <Badge variant="secondary">Score {run.score.toFixed(3)}</Badge> : null}
                  {typeof run.qualityScore === "number" ? <Badge variant="secondary">Quality {run.qualityScore}/100</Badge> : null}
                </div>
                <p className="text-sm text-brand-text/72">{run.failureReason ?? run.matchReason ?? "No match reason recorded."}</p>
              </CardContent>
            </Card>
          ))}
          {intentRuns.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-neutral-muted">Intent test run history will appear after the suite runs.</CardContent>
            </Card>
          ) : null}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Health export preview</CardTitle>
            <p className="text-sm text-neutral-muted">Internal summary is also available at /api/admin/agent-registry/health-export.</p>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <Badge variant="secondary">Apps {health.totalRegistryApps}</Badge>
            <Badge variant="ready">Published {health.publishedRegistryApps}</Badge>
            <Badge variant="secondary">Draft {health.draftRegistryApps}</Badge>
            <Badge variant="warning">Paused {health.pausedRegistryApps}</Badge>
            <Badge variant="agent">Capabilities {health.activeCapabilities}</Badge>
            <Badge variant="secondary">Avg quality {health.averageQualityScore}/100</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Trust trend preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {qualityTrend.map((entry) => (
              <div key={`${entry.observedAt.toISOString()}-${entry.query}`} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                <span className="text-brand-text/72">{entry.query}</span>
                <span className="font-medium text-brand-text">{entry.qualityScore ?? 0}/100</span>
              </div>
            ))}
            <Badge variant={metadataTrend.missingMetadataCount > 0 ? "warning" : "ready"}>
              {metadataTrend.missingMetadataCount} current missing metadata buckets
            </Badge>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-brand-text">Registry contract stability</h2>
          <p className="text-sm text-neutral-muted">Manifest versions, review dates, and recent registry-sensitive changes.</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Deprecated and paused capability surfaces</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <Badge variant="warning">Paused {distribution.pausedCapabilityCount ?? 0}</Badge>
              <Badge variant="danger">Deprecated {distribution.deprecatedCapabilityCount ?? 0}</Badge>
              <Badge variant="agent">Manifest-aware</Badge>
              <Badge variant="secondary">Search excludes deprecated</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent change history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {changeLogs.map((entry) => (
                <div key={entry.id} className="rounded-xl border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="agent">{entry.changeType.replace(/_/g, " ")}</Badge>
                    <span className="font-medium text-brand-text">{entry.app.name}</span>
                    {entry.capability ? <span className="text-neutral-muted">/ {entry.capability.name}</span> : null}
                  </div>
                  <p className="mt-1 text-neutral-muted">
                    {entry.fieldName} · {new Date(entry.createdAt).toLocaleString()}
                    {entry.capability ? ` · capability v${entry.capability.manifestVersion}` : ""}
                  </p>
                </div>
              ))}
              {changeLogs.length === 0 ? (
                <p className="text-sm text-neutral-muted">No registry-sensitive changes have been recorded yet.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>
    </AdminShell>
  );
}
