import { analyticsEvents, trackServerEvent } from "@cotana/analytics";
import { notFound } from "next/navigation";
import { listCategories, listDiscoveryResults, listPublicEditorialShelves, listPublishedApps } from "@cotana/db";
import { AppCard, SectionHeading } from "@cotana/ui";
import { EditorialShelfSection } from "../../../components/editorial-shelf-section";
import { StoreHeader } from "../../../components/store-header";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const categories = await listCategories();
  const category = categories.find((entry) => entry.slug === slug);

  if (!category) {
    notFound();
  }

  const [apps, shelves, trending, rising] = await Promise.all([
    listPublishedApps(slug),
    listPublicEditorialShelves({ surface: "category", categorySlug: slug }),
    listDiscoveryResults("TRENDING", { categorySlug: slug, limit: 6 }),
    listDiscoveryResults("RISING", { categorySlug: slug, limit: 6 })
  ]);

  for (const shelf of shelves) {
    void trackServerEvent({
      event: analyticsEvents.shelfImpression,
      distinctId: `category:${slug}:${shelf.slug}`,
      properties: {
        shelfSlug: shelf.slug,
        surface: "category",
        category: slug,
        itemCount: shelf.items.length
      }
    });
  }

  return (
    <main>
      <StoreHeader />
      <section className="mx-auto max-w-7xl space-y-6 px-6 py-10">
        <SectionHeading
          eyebrow={category.name}
          title={`${category.name} apps`}
          description="Initial category scaffolding for public browsing."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {apps.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
          {apps.length === 0 ? (
            <div className="rounded-card border border-dashed border-neutral-border bg-white p-6 text-sm text-neutral-muted">
              No published apps are live in this category yet.
            </div>
            ) : null}
        </div>

        {shelves.map((shelf) => (
          <EditorialShelfSection key={shelf.id} shelf={shelf} />
        ))}

        <section className="space-y-5">
          <SectionHeading
            eyebrow="Trending"
            title={`Trending in ${category.name}`}
            description="This category view uses the same deterministic ranking system with category-scoped activity."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {trending.rows.map((row, index) => (
              <AppCard
                key={row.app.id}
                app={row.app}
                href={`/apps/${row.app.slug}?ref=trending&category=${category.slug}&position=${index + 1}`}
              />
            ))}
            {trending.rows.length === 0 ? (
              <div className="rounded-card border border-dashed border-neutral-border bg-white p-6 text-sm text-neutral-muted">
                Category trending will appear after the first discovery recompute.
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-5">
          <SectionHeading
            eyebrow="Rising"
            title={`Rising in ${category.name}`}
            description="Rising highlights acceleration so smaller apps can still break through."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rising.rows.map((row, index) => (
              <AppCard
                key={row.app.id}
                app={row.app}
                href={`/apps/${row.app.slug}?ref=rising&category=${category.slug}&position=${index + 1}`}
              />
            ))}
            {rising.rows.length === 0 ? (
              <div className="rounded-card border border-dashed border-neutral-border bg-white p-6 text-sm text-neutral-muted">
                Category rising will appear after the first discovery recompute.
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}
