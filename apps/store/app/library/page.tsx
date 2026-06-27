import { listLibraryApps } from "@cotana/db";
import type { AppSummary } from "@cotana/types";
import { Card, CardContent, CardHeader, CardTitle, AppCard, SectionHeading } from "@cotana/ui";
import { StoreHeader } from "../../components/store-header";
import { getSessionUser } from "../../lib/session";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const sessionUser = await getSessionUser();
  const apps: AppSummary[] = sessionUser ? await listLibraryApps(sessionUser.id) : [];

  return (
    <main>
      <StoreHeader />
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-7 sm:px-6 sm:py-8">
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
                <p className="text-[0.84rem] text-neutral-muted">
                Saved apps appear here once you sign in and add them from an app detail page.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-4">
            {apps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
            {apps.length === 0 ? (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle>No saved apps yet</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[0.84rem] text-neutral-muted">
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
