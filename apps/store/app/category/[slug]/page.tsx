import { analyticsEvents, trackServerEvent } from "@cotana/analytics";
import { notFound } from "next/navigation";
import {
  getEmptyStateMessage,
  listCategories,
  listDiscoveryResults,
  listPublicEditorialShelves,
  listPublishedApps,
  type CategoryRecord,
  type DiscoveryAppResult,
  type PublicEditorialShelf
} from "@cotana/db";
import type { AppSummary } from "@cotana/types";
import { AppCard, SectionHeading } from "@cotana/ui";
import { EditorialShelfSection } from "../../../components/editorial-shelf-section";
import { StoreHeader } from "../../../components/store-header";
import { demoApps, uniqueDemoCategories } from "../../../lib/demo-catalog";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

type CategoryFallbackData = {
  apps: AppSummary[];
  shelves: PublicEditorialShelf[];
  trending: { computedAt: Date | null; rows: DiscoveryAppResult[] };
  rising: { computedAt: Date | null; rows: DiscoveryAppResult[] };
};

function demoDiscoveryRows(apps: AppSummary[]): DiscoveryAppResult[] {
  return apps.map((app, index) => ({
    app,
    score: app.rating,
    rank: index + 1,
    inputs: {} as DiscoveryAppResult["inputs"],
    computedAt: new Date("2026-01-01T00:00:00.000Z")
  }));
}

function emptyDiscoveryResult(): { computedAt: Date | null; rows: DiscoveryAppResult[] } {
  return { computedAt: null, rows: [] };
}

async function withTimeout<T>(promise: Promise<T>, fallback: T, timeoutMs = 2500): Promise<T> {
  const timeoutPromise = new Promise<T>((resolve) => {
    setTimeout(() => resolve(fallback), timeoutMs);
  });

  return Promise.race([promise.catch(() => fallback), timeoutPromise]);
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const categories: CategoryRecord[] = await withTimeout(listCategories(), uniqueDemoCategories());
  const displayCategories = categories.length > 0 ? categories : uniqueDemoCategories();
  const category = displayCategories.find((entry) => entry.slug === slug);

  if (!category) {
    notFound();
  }

  const fallbackApps = demoApps.filter((app) => app.category.slug === slug);
  const categoryData = await withTimeout<CategoryFallbackData>(
    Promise.all([
      listPublishedApps(slug),
      listPublicEditorialShelves({ surface: "category", categorySlug: slug }),
      listDiscoveryResults("TRENDING", { categorySlug: slug, limit: 6 }),
      listDiscoveryResults("RISING", { categorySlug: slug, limit: 6 })
    ]).then(([apps, shelves, trending, rising]) => ({
      apps,
      shelves,
      trending,
      rising
    })),
    {
      apps: fallbackApps,
      shelves: [],
      trending: emptyDiscoveryResult(),
      rising: emptyDiscoveryResult()
    }
  );
  const { apps, shelves, trending, rising } = categoryData;
  const displayApps = apps.length > 0 ? apps : fallbackApps;
  const trendingRows = trending.rows.length > 0 ? trending.rows : demoDiscoveryRows(fallbackApps.slice(0, 4));
  const risingRows = rising.rows.length > 0 ? rising.rows : demoDiscoveryRows(fallbackApps.slice(-4));

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
    <main className="min-h-screen bg-brand-surface">
      <StoreHeader />
      <section className="mx-auto max-w-7xl space-y-7 px-4 py-7 sm:px-6 sm:py-8">
        <SectionHeading
          eyebrow={category.name}
          title={`${category.name} apps`}
          description={`Browse trusted ${category.name.toLowerCase()} apps with ratings, reviews, and curated discovery rows.`}
        />
        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-4">
          {displayApps.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
          {displayApps.length === 0 ? (
            <div className="ui-empty-state p-4 text-[0.84rem]">
              {getEmptyStateMessage("category")}
            </div>
            ) : null}
        </div>

        {shelves.map((shelf) => (
          <EditorialShelfSection key={shelf.id} shelf={shelf} />
        ))}

        <section className="space-y-3.5">
          <SectionHeading
            eyebrow="Trending"
            title={`Trending in ${category.name}`}
            description="This category view uses the same deterministic ranking system with category-scoped activity."
          />
          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-4">
            {trendingRows.map((row, index) => (
              <AppCard
                key={row.app.id}
                app={row.app}
                href={`/apps/${row.app.slug}?ref=trending&category=${category.slug}&position=${index + 1}`}
              />
            ))}
            {trendingRows.length === 0 ? (
              <div className="ui-empty-state p-4 text-[0.84rem]">
                {getEmptyStateMessage("trending")}
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-3.5">
          <SectionHeading
            eyebrow="Rising"
            title={`Rising in ${category.name}`}
            description="Rising highlights acceleration so smaller apps can still break through."
          />
          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-4">
            {risingRows.map((row, index) => (
              <AppCard
                key={row.app.id}
                app={row.app}
                href={`/apps/${row.app.slug}?ref=rising&category=${category.slug}&position=${index + 1}`}
              />
            ))}
            {risingRows.length === 0 ? (
              <div className="ui-empty-state p-4 text-[0.84rem]">
                {getEmptyStateMessage("rising")}
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}
