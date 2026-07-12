import { isAdminUser } from "@cotana/auth";
import { validateRuntimeEnvironment } from "@cotana/config";
import { getLaunchHealth } from "@cotana/db";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@cotana/ui";
import { AdminAuthGate } from "../../components/admin-auth-gate";
import { AdminShell } from "../../components/admin-shell";
import { getSessionUser } from "../../lib/session";

export const dynamic = "force-dynamic";

function badgeVariant(status: string) {
  return status === "pass" || status === "ok" ? "ready" : status === "fail" ? "danger" : "warning";
}

export default async function EnvironmentHealthPage() {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return (
      <AdminShell title="Environment health" description="Admin-only staging launch environment validation.">
        <AdminAuthGate />
      </AdminShell>
    );
  }

  const [validation, health] = await Promise.all([Promise.resolve(validateRuntimeEnvironment()), getLaunchHealth("admin")]);

  return (
    <AdminShell
      title="Environment health"
      description="Configuration validation, local fallbacks, and deployment health for staging launch readiness."
    >
      <section className="grid gap-3 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Validation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge variant={badgeVariant(validation.status)}>{validation.status}</Badge>
            <p className="font-body text-sm text-neutral-muted">{validation.environment}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Runtime</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant={health.databaseReachable ? "ready" : "danger"}>Database {health.databaseReachable ? "reachable" : "down"}</Badge>
            <Badge variant={health.redisReachable ? "ready" : "warning"}>Redis {health.redisReachable ? "reachable" : "fallback"}</Badge>
            <Badge variant={health.authConfigPresent ? "ready" : "warning"}>Auth {health.authConfigPresent ? "configured" : "incomplete"}</Badge>
            <Badge variant={health.analyticsConfigPresent ? "ready" : "warning"}>Analytics {health.analyticsConfigPresent ? "configured" : "off"}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Fallbacks</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {validation.localFallbacks.map((fallback) => (
              <Badge key={fallback} variant="warning">{fallback.replace(/_/g, " ")}</Badge>
            ))}
            {validation.localFallbacks.length === 0 ? <Badge variant="ready">No local fallbacks</Badge> : null}
          </CardContent>
        </Card>
      </section>
      <section className="grid gap-3 lg:grid-cols-2">
        {validation.checks.map((check) => (
          <Card key={`${check.scope}-${check.key}`}>
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div>
                <p className="font-heading font-semibold text-brand-text">{check.key}</p>
                <p className="font-body text-sm text-neutral-muted">{check.message}</p>
              </div>
              <Badge variant={badgeVariant(check.status)}>{check.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </section>
    </AdminShell>
  );
}
