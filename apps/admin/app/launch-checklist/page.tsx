import { isAdminUser } from "@cotana/auth";
import { analyticsQaEvents, registryClientExamples } from "@cotana/config";
import { getLaunchChecklist } from "@cotana/db";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@cotana/ui";
import { AdminAuthGate } from "../../components/admin-auth-gate";
import { AdminShell } from "../../components/admin-shell";
import { getSessionUser } from "../../lib/session";

export const dynamic = "force-dynamic";

function badgeVariant(status: string) {
  return status === "pass" ? "ready" : status === "fail" ? "danger" : "warning";
}

export default async function LaunchChecklistPage() {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return (
      <AdminShell title="Launch checklist" description="Admin-only staging launch readiness checklist.">
        <AdminAuthGate />
      </AdminShell>
    );
  }

  const checklist = await getLaunchChecklist();

  return (
    <AdminShell
      title="Launch checklist"
      description="Staging launch readiness across environment, catalog coverage, registry QA, smoke-critical routes, and analytics names."
    >
      <section className="grid gap-3 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Overall</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge variant={badgeVariant(checklist.status)}>{checklist.status}</Badge>
            <p className="font-body text-sm text-neutral-muted">{new Date(checklist.generatedAt).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Registry QA</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant={checklist.summary.failingIntentTests > 0 ? "danger" : "ready"}>{checklist.summary.failingIntentTests} intent failures</Badge>
            <Badge variant={checklist.summary.failingRedTeamTests > 0 ? "danger" : "ready"}>{checklist.summary.failingRedTeamTests} red-team failures</Badge>
            <Badge variant={checklist.summary.weakDocsCapabilities > 0 ? "warning" : "ready"}>{checklist.summary.weakDocsCapabilities} weak docs</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Catalog QA</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant={checklist.summary.thinCategoryCount > 0 ? "warning" : "ready"}>{checklist.summary.thinCategoryCount} thin categories</Badge>
            <Badge variant={checklist.summary.appsWithoutScreenshots > 0 ? "warning" : "ready"}>{checklist.summary.appsWithoutScreenshots} missing screenshots</Badge>
            <Badge variant={checklist.summary.publishedAppsWithoutUpdates > 0 ? "warning" : "ready"}>{checklist.summary.publishedAppsWithoutUpdates} missing updates</Badge>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Public seed visibility</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Badge variant={checklist.seedVisibility.publishedAppCount > 0 ? "ready" : "danger"}>
            {checklist.seedVisibility.publishedAppCount} published apps
          </Badge>
          <Badge variant={checklist.seedVisibility.homepageShelfItemCount > 0 ? "ready" : "danger"}>
            {checklist.seedVisibility.homepageShelfItemCount} spotlight items
          </Badge>
          <Badge variant={checklist.seedVisibility.trendingItemCount > 0 ? "ready" : "danger"}>
            {checklist.seedVisibility.trendingItemCount} trending
          </Badge>
          <Badge variant={checklist.seedVisibility.risingItemCount > 0 ? "ready" : "danger"}>
            {checklist.seedVisibility.risingItemCount} rising
          </Badge>
          <Badge variant={checklist.seedVisibility.categoriesWithApps > 0 ? "ready" : "danger"}>
            {checklist.seedVisibility.categoriesWithApps} categories
          </Badge>
          <Badge variant={checklist.seedVisibility.appsWithScreenshots > 0 ? "ready" : "danger"}>
            {checklist.seedVisibility.appsWithScreenshots} with screenshots
          </Badge>
          <Badge variant={checklist.seedVisibility.appsWithReviews > 0 ? "ready" : "danger"}>
            {checklist.seedVisibility.appsWithReviews} with reviews
          </Badge>
          <Badge variant={checklist.seedVisibility.appsWithUpdates > 0 ? "ready" : "danger"}>
            {checklist.seedVisibility.appsWithUpdates} with updates
          </Badge>
          <Badge variant={checklist.seedVisibility.registryPublishedListings > 0 ? "ready" : "danger"}>
            {checklist.seedVisibility.registryPublishedListings} registry listings
          </Badge>
          <Badge variant={checklist.seedVisibility.activeCapabilities > 0 ? "ready" : "danger"}>
            {checklist.seedVisibility.activeCapabilities} capabilities
          </Badge>
        </CardContent>
      </Card>

      <section className="grid gap-3 lg:grid-cols-2">
        {checklist.items.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div>
                <p className="font-heading font-semibold text-brand-text">{item.label}</p>
                <p className="font-body text-sm text-neutral-muted">{item.detail}</p>
              </div>
              <Badge variant={badgeVariant(item.status)}>{item.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Registry client examples</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {registryClientExamples.map((example) => (
              <div key={example.label} className="rounded-card border border-neutral-border bg-neutral-surface p-3">
                <p className="font-heading text-sm font-semibold text-brand-text">{example.label}</p>
                <code className="mt-1 block overflow-x-auto font-mono text-xs text-neutral-muted">{example.command}</code>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Analytics event reference</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {analyticsQaEvents.map((event) => (
              <Badge key={event} variant="secondary">{event}</Badge>
            ))}
          </CardContent>
        </Card>
      </section>
    </AdminShell>
  );
}
