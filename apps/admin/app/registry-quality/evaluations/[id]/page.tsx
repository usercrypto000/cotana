import { isAdminUser } from "@cotana/auth";
import { getAgentRegistryEvaluationLog } from "@cotana/db";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@cotana/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminAuthGate } from "../../../../components/admin-auth-gate";
import { AdminShell } from "../../../../components/admin-shell";
import { getSessionUser } from "../../../../lib/session";

export const dynamic = "force-dynamic";

function formatValue(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function formatBucket(value: string) {
  return value.replace(/_/g, " ");
}

export default async function RegistryEvaluationLogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return (
      <AdminShell title="Registry evaluation" description="Admin-only registry search diagnostics.">
        <AdminAuthGate />
      </AdminShell>
    );
  }

  const { id } = await params;
  const log = await getAgentRegistryEvaluationLog(id);

  if (!log) {
    notFound();
  }

  const excludedCandidates = Array.isArray(log.excludedCandidatesJson) ? log.excludedCandidatesJson : [];

  return (
    <AdminShell title="Registry evaluation" description="Single-search diagnostic record for agent registry QA.">
      <div>
        <Link href="/registry-quality">
          <Badge variant="agent">Back to registry quality</Badge>
        </Link>
      </div>

      <section className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>{log.query}</CardTitle>
            <p className="text-sm text-neutral-muted">{new Date(log.createdAt).toLocaleString()}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{log.resultCount} results</Badge>
              <Badge variant="secondary">{log.candidateCount} candidates</Badge>
              <Badge variant="secondary">{log.matchedCapabilityCount} matched capabilities</Badge>
              <Badge variant={log.blockingIssueCount > 0 ? "warning" : "ready"}>{log.blockingIssueCount} blocking issues</Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Badge variant="secondary">App {log.topAppSlug ?? log.topAppId ?? "none"}</Badge>
              <Badge variant="secondary">Capability {log.topCapabilitySlug ?? log.topCapabilityId ?? "none"}</Badge>
              <Badge variant="secondary">Category {log.topCategorySlug ?? "none"}</Badge>
              <Badge variant="secondary">Type {log.topCapabilityType ?? "none"}</Badge>
              <Badge variant="secondary">Auth {log.topAuthType ?? "none"}</Badge>
              <Badge variant="secondary">Interface {log.topInterfaceType ?? "none"}</Badge>
              <Badge variant={log.topInteractionMode === "READ_ONLY" ? "ready" : "danger"}>Mode {log.topInteractionMode ?? "none"}</Badge>
              {log.topReadinessBucket ? (
                <Badge variant={log.topReadinessBucket === "ready" ? "ready" : "warning"}>
                  {formatBucket(log.topReadinessBucket)}
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-brand-text/72">{log.topMatchReason ?? "No top match reason recorded."}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scores</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-xl border bg-neutral-surface p-3">
              <p className="text-xs uppercase text-neutral-muted">Similarity</p>
              <p className="mt-1 text-2xl font-semibold text-brand-text">{log.topSimilarity?.toFixed(3) ?? "n/a"}</p>
            </div>
            <div className="rounded-xl border bg-neutral-surface p-3">
              <p className="text-xs uppercase text-neutral-muted">Score</p>
              <p className="mt-1 text-2xl font-semibold text-brand-text">{log.topScore?.toFixed(3) ?? "n/a"}</p>
            </div>
            <div className="rounded-xl border bg-neutral-surface p-3">
              <p className="text-xs uppercase text-neutral-muted">Quality</p>
              <p className="mt-1 text-2xl font-semibold text-brand-text">{log.topQualityScore ?? "n/a"}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-xl bg-brand-text p-4 text-xs text-neutral-inverse/90">{formatValue(log.filtersJson)}</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Excluded candidates</CardTitle>
            <p className="text-sm text-neutral-muted">{excludedCandidates.length} candidates excluded or blocked.</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {excludedCandidates.slice(0, 20).map((candidate, index) => (
              <pre key={`${log.id}-${index}`} className="overflow-auto rounded-xl border bg-neutral-surface p-3 text-xs text-brand-text/80">
                {formatValue(candidate)}
              </pre>
            ))}
            {excludedCandidates.length === 0 ? (
              <p className="text-sm text-neutral-muted">No excluded candidates were recorded.</p>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </AdminShell>
  );
}
