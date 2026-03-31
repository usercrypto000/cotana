import Image from "next/image";
import Link from "next/link";
import { isAdminUser } from "@cotana/auth";
import { listAdminApps, listFlaggedReviews } from "@cotana/db";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@cotana/ui";
import { AdminAuthGate } from "../components/admin-auth-gate";
import { AdminShell } from "../components/admin-shell";
import { getSessionUser } from "../lib/session";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const sessionUser = await getSessionUser();
  const [apps, flaggedReviews] = isAdminUser(sessionUser)
    ? await Promise.all([listAdminApps(), listFlaggedReviews()])
    : [[], []];
  const publishedCount = apps.filter((app) => app.status === "PUBLISHED").length;
  const draftCount = apps.filter((app) => app.status === "DRAFT").length;

  if (!isAdminUser(sessionUser)) {
    return (
      <AdminShell
        title="Catalog command center"
        description="Admin access is limited to allowlisted accounts and database admins."
      >
        <AdminAuthGate />
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Catalog command center"
      description="This initial dashboard gives us a clean internal surface for app CRUD, publishing, moderation, and signal jobs."
    >
      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Published-ready apps</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold text-slate-950">{publishedCount}</p>
            <p className="mt-2 text-sm text-slate-500">
              {draftCount} draft {draftCount === 1 ? "entry is" : "entries are"} still waiting on publish decisions.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Flag queue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold text-slate-950">{flaggedReviews.length}</p>
            <p className="mt-2 text-sm text-slate-500">
              Reviews stay public until moderation decides to dismiss or remove them.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Signal jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold text-slate-950">3</p>
            <p className="mt-2 text-sm text-slate-500">
              DeFi, lending &amp; yield, and prediction markets are planned first.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4 rounded-[1.75rem] border border-white/10 bg-slate-900 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Catalog entries</h2>
            <p className="text-sm text-slate-400">Admin-only creation and editing starts from this baseline.</p>
          </div>
          <Button asChild>
            <Link href="/apps/new">Create app</Link>
          </Button>
        </div>
        <div className="grid gap-3">
          {apps.map((app) => (
            <div
              key={app.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-200 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">
                  <Image
                    src={app.logoUrl}
                    alt={`${app.name} logo`}
                    width={40}
                    height={40}
                    unoptimized
                    className="h-10 w-10 rounded-xl object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{app.name}</span>
                    {app.verified ? <Badge>Verified</Badge> : null}
                  </div>
                  <p className="text-slate-400">{app.shortDescription}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline">{app.status}</Badge>
                <Badge variant="outline">{app.category.name}</Badge>
                <Button asChild variant="secondary">
                  <Link href={`/apps/${app.id}`}>Edit</Link>
                </Button>
              </div>
            </div>
          ))}
          {apps.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-6 text-sm text-slate-400">
              No apps are in the catalog yet. Create the first draft to unlock the public store.
            </div>
          ) : null}
        </div>
      </section>
    </AdminShell>
  );
}
