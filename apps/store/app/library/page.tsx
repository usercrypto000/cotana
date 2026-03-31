import { listLibraryApps } from "@cotana/db";
import { Card, CardContent, CardHeader, CardTitle, AppCard, SectionHeading } from "@cotana/ui";
import { StoreHeader } from "../../components/store-header";
import { getSessionUser } from "../../lib/session";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const sessionUser = await getSessionUser();
  const apps = sessionUser ? await listLibraryApps(sessionUser.id) : [];

  return (
    <main>
      <StoreHeader />
      <section className="mx-auto max-w-7xl space-y-6 px-6 py-10">
        <SectionHeading
          eyebrow="Private library"
          title="Saved apps"
          description="Your library is private and only visible after you sign in."
        />
        {!sessionUser ? (
          <Card>
            <CardHeader>
              <CardTitle>Sign in to view your library</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">
                Saved apps appear here once you sign in and add them from an app detail page.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {apps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
            {apps.length === 0 ? (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle>No saved apps yet</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500">
                    Browse the catalog and save apps to build your private shortlist.
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
