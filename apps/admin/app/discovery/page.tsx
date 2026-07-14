import { isAdminUser } from "@cotana/auth";
import {
  listDiscoveryConfigEntries,
  listDiscoveryDebugRows,
  listSignalSnapshotHealth
} from "@cotana/db";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@cotana/ui";
import { AdminAuthGate } from "../../components/admin-auth-gate";
import { AdminShell } from "../../components/admin-shell";
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
    snapshotHealth
  ] = await Promise.all([
    listDiscoveryDebugRows("TRENDING", { limit: 8 }),
    listDiscoveryDebugRows("RISING", { limit: 8 }),
    listDiscoveryDebugRows("COMMUNITY_PICK", { limit: 8 }),
    listDiscoveryConfigEntries(),
    listSignalSnapshotHealth()
  ]);

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
              <p className="text-sm text-neutral-muted">
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
                  <div key={`${section.label}-${row.appId}`} className="rounded-2xl border bg-neutral-surface p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-brand-text">{row.appName}</p>
                        <p className="text-xs text-neutral-muted">{row.categorySlug}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-brand-text">#{row.rank}</p>
                        <p className="text-xs text-neutral-muted">{row.score.toFixed(3)}</p>
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
                <div className="rounded-2xl border border-dashed border-neutral-border bg-neutral-panel p-4 text-sm text-neutral-muted">
                  No {section.label.toLowerCase()} snapshot yet.
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
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
                <p className="text-sm text-neutral-muted">{entry.category}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-brand-text/72">{entry.count} snapshots stored</p>
                <p className="text-sm text-neutral-muted">
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
