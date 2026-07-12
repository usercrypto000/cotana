import { isAdminUser } from "@cotana/auth";
import { getCatalogCoverageAudit } from "@cotana/db";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@cotana/ui";
import { AdminAuthGate } from "../../components/admin-auth-gate";
import { AdminShell } from "../../components/admin-shell";
import { getSessionUser } from "../../lib/session";

export const dynamic = "force-dynamic";

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default async function CatalogCoveragePage() {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return (
      <AdminShell title="Catalog coverage" description="Admin-only launch catalog coverage audit.">
        <AdminAuthGate />
      </AdminShell>
    );
  }

  const audit = await getCatalogCoverageAudit();

  return (
    <AdminShell
      title="Catalog coverage"
      description="Launch QA for public catalog depth and machine-readable registry coverage."
    >
      <section className="grid gap-3 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Audit warnings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge variant={audit.warnings.length > 0 ? "warning" : "ready"}>{audit.warnings.length} warnings</Badge>
            <p className="font-body text-sm text-neutral-muted">{audit.generatedAt.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Human categories</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {audit.humanCategories.map((entry) => (
              <Badge key={entry.category.slug} variant={entry.warnings.length > 0 ? "warning" : "secondary"}>
                {entry.category.name}: {entry.totalPublishedApps}
              </Badge>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Agent capability types</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {audit.capabilityTypes.map((entry) => (
              <Badge key={entry.capabilityType} variant={entry.warnings.length > 0 ? "warning" : "agent"}>
                {entry.capabilityType}: {entry.activeCapabilities}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-semibold text-brand-text">Human catalog</h2>
        <div className="grid gap-3">
          {audit.humanCategories.map((entry) => (
            <Card key={entry.category.slug}>
              <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_2fr]">
                <div>
                  <p className="font-heading font-semibold text-brand-text">{entry.category.name}</p>
                  <p className="font-body text-sm text-neutral-muted">
                    {entry.totalPublishedApps} published · {entry.totalDraftApps} draft
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Screenshots {entry.appsWithScreenshots}</Badge>
                  <Badge variant="secondary">Reviews {entry.appsWithReviews}</Badge>
                  <Badge variant="secondary">Updates {entry.appsWithUpdates}</Badge>
                  <Badge variant="ready">Verified {entry.appsWithVerifiedBadge}</Badge>
                  <Badge variant="ready">Community {entry.appsWithCommunityPickStatus}</Badge>
                  <Badge variant="secondary">Signals {entry.appsWithSignalSnapshots}</Badge>
                  {entry.warnings.map((warning) => (
                    <Badge key={warning} variant="warning">{warning}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-semibold text-brand-text">Agent registry</h2>
        <div className="grid gap-3">
          {audit.agentCategories.map((entry) => (
            <Card key={entry.category.slug}>
              <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_2fr]">
                <div>
                  <p className="font-heading font-semibold text-brand-text">{entry.category.name}</p>
                  <p className="font-body text-sm text-neutral-muted">
                    {entry.totalRegistryApps} registry apps · {entry.activeCapabilities} active capabilities
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="ready">Published {entry.publishedRegistryListings}</Badge>
                  <Badge variant="secondary">Draft {entry.draftRegistryListings}</Badge>
                  <Badge variant="warning">Paused {entry.pausedRegistryListings}</Badge>
                  <Badge variant="danger">Deprecated {entry.deprecatedCapabilities}</Badge>
                  <Badge variant="agent">Quality {entry.averageCapabilityQuality}/100</Badge>
                  <Badge variant="secondary">Schema {percent(entry.schemaCoverage)}</Badge>
                  <Badge variant="secondary">Docs {percent(entry.docsCoverage)}</Badge>
                  <Badge variant="secondary">Safety {percent(entry.safetyNotesCoverage)}</Badge>
                  <Badge variant="ready">Read-only {percent(entry.readOnlyCoverage)}</Badge>
                  {entry.warnings.map((warning) => (
                    <Badge key={warning} variant="warning">{warning}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
