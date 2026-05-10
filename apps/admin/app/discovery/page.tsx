import { isAdminUser } from "@cotana/auth";
import {
  listDiscoveryConfigEntries,
  listDiscoveryDebugRows,
  listAgentRegistryQualityRows,
  getAgentRegistryQualitySummary,
  listAgentIntentTestCases,
  listAgentRegistryEvaluationLogs,
  listSignalSnapshotHealth
} from "@cotana/db";
import { runAgentIntentTestSuite } from "@cotana/search";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@cotana/ui";
import { AdminAuthGate } from "../../components/admin-auth-gate";
import { AdminShell } from "../../components/admin-shell";
import { AgentRegistryPreviewPanel } from "../../components/agent-registry-preview-panel";
import { DiscoveryConfigPanel } from "../../components/discovery-config-panel";
import { getSessionUser } from "../../lib/session";

export const dynamic = "force-dynamic";

export default async function DiscoveryPage() {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return (
      <AdminShell
        title="Discovery intelligence"
        description="Discovery controls are limited to admins."
      >
        <AdminAuthGate />
      </AdminShell>
    );
  }

  const [
    trending,
    rising,
    communityPick,
    configEntries,
    snapshotHealth,
    agentQualityRows,
    agentQualitySummary,
    agentEvaluationLogs,
    agentIntentTestCases
  ] = await Promise.all([
    listDiscoveryDebugRows("TRENDING", { limit: 8 }),
    listDiscoveryDebugRows("RISING", { limit: 8 }),
    listDiscoveryDebugRows("COMMUNITY_PICK", { limit: 8 }),
    listDiscoveryConfigEntries(),
    listSignalSnapshotHealth(),
    listAgentRegistryQualityRows(),
    getAgentRegistryQualitySummary(),
    listAgentRegistryEvaluationLogs(8),
    listAgentIntentTestCases()
  ]);
  const agentIntentResults = await runAgentIntentTestSuite(agentIntentTestCases);

  return (
    <AdminShell
      title="Discovery intelligence"
      description="Inspect discovery outputs, tune weights, and keep an eye on snapshot health without turning this into a bloated back office."
    >
      <section className="grid gap-4 lg:grid-cols-3">
        {[
          { label: "Trending", data: trending },
          { label: "Rising", data: rising },
          { label: "Community pick", data: communityPick }
        ].map((section) => (
          <Card key={section.label}>
            <CardHeader>
              <CardTitle>{section.label}</CardTitle>
              <p className="text-sm text-slate-500">
                {section.data.computedAt
                  ? `Computed ${new Date(section.data.computedAt).toLocaleString()}`
                  : "No snapshot yet."}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {section.data.rows.map((row) => {
                const raw =
                  row.inputsJson && typeof row.inputsJson === "object" && !Array.isArray(row.inputsJson)
                    ? ((row.inputsJson as { raw?: Record<string, number> }).raw ?? {})
                    : {};

                return (
                  <div key={`${section.label}-${row.appId}`} className="rounded-2xl border bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{row.appName}</p>
                        <p className="text-xs text-slate-500">{row.categorySlug}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-950">#{row.rank}</p>
                        <p className="text-xs text-slate-500">{row.score.toFixed(3)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="secondary">Views {Number(raw.viewsCurrent ?? 0)}</Badge>
                      <Badge variant="secondary">Clicks {Number(raw.searchClicksCurrent ?? 0)}</Badge>
                      <Badge variant="secondary">Likes {Number(raw.likesCurrent ?? 0)}</Badge>
                      <Badge variant="secondary">Reviews {Number(raw.reviewsCurrent ?? 0)}</Badge>
                    </div>
                  </div>
                );
              })}
              {section.data.rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                  No {section.label.toLowerCase()} snapshot yet.
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-brand-text">Agent registry preview</h2>
          <p className="text-sm text-neutral-muted">
            Simulate outside-agent discovery with compatibility filters before changing registry metadata.
          </p>
        </div>
        <AgentRegistryPreviewPanel />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-brand-text">Agent registry quality</h2>
          <p className="text-sm text-neutral-muted">
            Discovery-only readiness checks for apps exposed to outside agents.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Listings</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{agentQualitySummary.totalListings}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Ready</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{agentQualitySummary.readyListings}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Needs work</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{agentQualitySummary.needsWorkListings}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Avg readiness</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">
                {agentQualitySummary.averageReadinessScore}/100
              </p>
            </CardContent>
          </Card>
        </div>
        {agentQualitySummary.topIssues.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Top registry issues</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {agentQualitySummary.topIssues.map((entry) => (
                <Badge key={entry.issue} variant="secondary">
                  {entry.count}x {entry.issue}
                </Badge>
              ))}
            </CardContent>
          </Card>
        ) : null}
        <div className="grid gap-3 md:grid-cols-4">
          {Object.entries(agentQualitySummary.statusCounts).map(([status, count]) => (
            <Card key={status}>
              <CardContent className="p-4">
                <p className="text-sm capitalize text-slate-500">{status.replace(/_/g, " ")}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{count}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {agentQualityRows.map((row) => (
            <Card key={row.appId}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{row.name}</CardTitle>
                  <p className="text-sm text-slate-500">{row.category.name}</p>
                </div>
                <Badge variant={row.ready ? "ready" : "warning"}>{row.ready ? "Ready" : "Needs work"}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{row.agentAudience}</Badge>
                  <Badge variant="secondary">{row.agentListingStatus}</Badge>
                  <Badge variant="secondary">
                    {row.activeCapabilityCount}/{row.totalCapabilityCount} active
                  </Badge>
                  <Badge variant={row.readinessScore >= 80 ? "ready" : "warning"}>
                    {row.readinessScore}/100 readiness
                  </Badge>
                  <Badge variant={row.ready ? "ready" : "warning"}>{row.readinessStatus.replace(/_/g, " ")}</Badge>
                  {row.blockingIssueCount > 0 ? (
                    <Badge variant="danger">{row.blockingIssueCount} blocking</Badge>
                  ) : null}
                </div>
                {row.issues.length > 0 ? (
                  <ul className="space-y-2 text-sm text-slate-600">
                    {row.issues.map((issue) => (
                      <li key={`${row.appId}-${issue}`}>{issue}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No registry quality issues found.</p>
                )}
              </CardContent>
            </Card>
          ))}
          {agentQualityRows.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-slate-500">
                No agent or hybrid listings have been configured yet.
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-brand-text">Agent intent tests</h2>
          <p className="text-sm text-neutral-muted">
            Seeded discovery checks for whether common outside-agent intents land on the right capability type.
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {agentIntentResults.map((result) => (
            <Card key={result.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{result.intent}</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">{result.reason}</p>
                </div>
                <Badge variant={result.passed ? "ready" : "warning"}>{result.passed ? "Pass" : "Inspect"}</Badge>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Badge variant="secondary">{result.categorySlug ?? "all"}</Badge>
                <Badge variant="secondary">App {result.topAppSlug ?? "none"}</Badge>
                <Badge variant="secondary">Capability {result.topCapabilitySlug ?? "none"}</Badge>
                <Badge variant="secondary">Type {result.topCapabilityType ?? "none"}</Badge>
                {typeof result.topScore === "number" ? (
                  <Badge variant="secondary">Score {result.topScore.toFixed(3)}</Badge>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-brand-text">Registry evaluation logs</h2>
          <p className="text-sm text-neutral-muted">
            Recent agent searches with matched capability, score, similarity, exclusions, and blocking counts.
          </p>
        </div>
        <div className="grid gap-3">
          {agentEvaluationLogs.map((log) => (
            <Card key={log.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{log.query}</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">
                    {new Date(log.createdAt).toLocaleString()} · {log.resultCount} results · {log.candidateCount} candidates
                  </p>
                </div>
                <Badge variant={log.blockingIssueCount > 0 ? "warning" : "ready"}>
                  {log.blockingIssueCount} excluded
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-600">
                <p>{log.topMatchReason ?? "No top match recorded."}</p>
                <div className="flex flex-wrap gap-2">
                  {typeof log.topSimilarity === "number" ? (
                    <Badge variant="secondary">Similarity {log.topSimilarity.toFixed(3)}</Badge>
                  ) : null}
                  {typeof log.topScore === "number" ? (
                    <Badge variant="secondary">Score {log.topScore.toFixed(3)}</Badge>
                  ) : null}
                  {typeof log.topQualityScore === "number" ? (
                    <Badge variant="secondary">Quality {log.topQualityScore}/100</Badge>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
          {agentEvaluationLogs.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-slate-500">
                Agent search evaluation logs will appear after registry searches run.
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-brand-text">Ranking configs</h2>
          <p className="text-sm text-neutral-muted">
            Tune the deterministic formulas carefully through ConfigKV-backed JSON.
          </p>
        </div>
        <DiscoveryConfigPanel entries={configEntries} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-brand-text">Signal snapshot health</h2>
          <p className="text-sm text-neutral-muted">Weekly historical snapshots and provider coverage at a glance.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {snapshotHealth.map((entry) => (
            <Card key={`${entry.category}-${entry.metric}`}>
              <CardHeader>
                <CardTitle>{entry.metric}</CardTitle>
                <p className="text-sm text-slate-500">{entry.category}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-slate-600">{entry.count} snapshots stored</p>
                <p className="text-sm text-slate-500">
                  {entry.lastObservedAt ? new Date(entry.lastObservedAt).toLocaleString() : "No snapshots yet"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
