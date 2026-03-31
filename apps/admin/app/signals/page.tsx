import { isAdminUser } from "@cotana/auth/authorization";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@cotana/ui";
import { AdminAuthGate } from "../../components/admin-auth-gate";
import { AdminShell } from "../../components/admin-shell";
import { SignalJobControls } from "../../components/signal-job-controls";
import { listSignalJobsWithStatus } from "../../lib/jobs";
import { getSessionUser } from "../../lib/session";

export const dynamic = "force-dynamic";

export default async function SignalsPage() {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return (
      <AdminShell
        title="Signal jobs"
        description="Signal refresh schedules and manual runs are only available to admins."
      >
        <AdminAuthGate />
      </AdminShell>
    );
  }

  const jobs = await listSignalJobsWithStatus();

  return (
    <AdminShell
      title="Signal jobs"
      description="Background refreshes, snapshots, and trending recomputes are registered with Inngest and can also be run manually here."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {jobs.map((job) => (
          <Card key={job.key}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle>{job.label}</CardTitle>
                <Badge variant="secondary">{job.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-500">{job.schedule}</p>
              <p className="text-sm text-slate-500">{job.summary ?? "No run summary yet."}</p>
              {job.lastRunAt ? <p className="text-xs text-slate-400">Last run: {new Date(job.lastRunAt).toLocaleString()}</p> : null}
              {job.lastError ? <p className="text-sm text-rose-600">{job.lastError}</p> : null}
              <SignalJobControls jobKey={job.key} />
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
