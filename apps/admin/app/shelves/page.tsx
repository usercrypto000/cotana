import Link from "next/link";
import { isAdminUser } from "@cotana/auth";
import { listAdminEditorialShelves } from "@cotana/db";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@cotana/ui";
import { AdminAuthGate } from "../../components/admin-auth-gate";
import { AdminShell } from "../../components/admin-shell";
import { getSessionUser } from "../../lib/session";

export const dynamic = "force-dynamic";

export default async function AdminShelvesPage() {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return (
      <AdminShell title="Editorial shelves" description="Curated discovery surfaces are limited to admins.">
        <AdminAuthGate />
      </AdminShell>
    );
  }

  const shelves = await listAdminEditorialShelves();

  return (
    <AdminShell
      title="Editorial shelves"
      description="Manage curated homepage and category collections without changing the deterministic ranking core."
    >
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Shelf list</h2>
            <p className="text-sm text-slate-400">Create, reorder, and publish the shelves that shape discovery.</p>
          </div>
          <Button asChild>
            <Link href="/shelves/new">Create shelf</Link>
          </Button>
        </div>
        <div className="grid gap-4">
          {shelves.map((shelf) => (
            <Card key={shelf.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{shelf.title}</CardTitle>
                  <p className="mt-2 text-sm text-slate-500">{shelf.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{shelf.status}</Badge>
                  <Badge variant="secondary">{shelf.visibility}</Badge>
                  {shelf.category ? <Badge variant="secondary">{shelf.category.name}</Badge> : null}
                  {shelf.pinned ? <Badge>Pinned</Badge> : null}
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4">
                <p className="text-sm text-slate-500">
                  {shelf.itemCount} app{shelf.itemCount === 1 ? "" : "s"} in shelf. Sort order {shelf.sortOrder}.
                </p>
                <Button asChild variant="secondary">
                  <Link href={`/shelves/${shelf.id}`}>Edit shelf</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
          {shelves.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-6 text-sm text-slate-400">
              No editorial shelves exist yet.
            </div>
          ) : null}
        </div>
      </section>
    </AdminShell>
  );
}
