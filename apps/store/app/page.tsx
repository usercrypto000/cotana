import { analyticsEvents, trackServerEvent } from "@cotana/analytics";
import Link from "next/link";
import { listCategories, listDiscoveryResults, listPublicEditorialShelves, listPublishedApps } from "@cotana/db";
import { AppCard, Badge, Button, SectionHeading } from "@cotana/ui";
import { EditorialShelfSection } from "../components/editorial-shelf-section";
import { StoreHeader } from "../components/store-header";

export const dynamic = "force-dynamic";

export default async function StoreHomePage() {
  const [apps, categories, shelves, trending, rising] = await Promise.all([
    listPublishedApps(),
    listCategories(),
    listPublicEditorialShelves({ surface: "home" }),
    listDiscoveryResults("TRENDING", { limit: 6 }),
    listDiscoveryResults("RISING", { limit: 6 })
  ]);
  const spotlightApps = apps.slice(0, 3);
  const newestApps = apps.slice(3, 6);

  for (const shelf of shelves) {
    void trackServerEvent({
      event: analyticsEvents.shelfImpression,
      distinctId: `home:${shelf.slug}`,
      properties: {
        shelfSlug: shelf.slug,
        surface: "home",
        itemCount: shelf.items.length
      }
    });
  }

  return (
    <main>
      <StoreHeader />
      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
        <div className="grid gap-8 rounded-card border border-neutral-border bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <Badge>Discovery marketplace</Badge>
            <div className="space-y-4">
              <h1 className="max-w-2xl font-heading text-4xl font-semibold tracking-tight text-brand-text sm:text-5xl">
                Find the right app with consumer-native discovery.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-neutral-muted sm:text-lg">
                Cotana hides the technical noise and helps people browse, compare, and save apps through
                a clean app-store experience.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/search">Try intent search</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/category/lending-yield">Explore lending &amp; yield</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-3 rounded-card bg-brand-primary p-5 text-white">
            <div>
              <p className="font-heading text-sm uppercase tracking-[0.16em] text-white/70">Popular prompts</p>
              <ul className="mt-4 space-y-3 text-sm text-white/80">
                <li>&quot;best yield apps for stablecoins&quot;</li>
                <li>&quot;prediction markets with strong liquidity&quot;</li>
                <li>&quot;simple DeFi apps for passive income&quot;</li>
              </ul>
            </div>
            <div className="rounded-card bg-white/10 p-4">
              <p className="text-sm text-white/70">
                Category-aware scoring will use platform trust signals plus category-specific metrics.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {categories.map((category) => (
            <Link key={category.slug} href={category.slug === "all" ? "/" : `/category/${category.slug}`}>
              <Badge variant="secondary">{category.name}</Badge>
            </Link>
          ))}
        </div>

        <section className="space-y-5">
          <SectionHeading
            eyebrow="Spotlight"
            title="Curated picks for the first release"
            description="Cards stay intentionally minimal so ranking quality, not visual clutter, carries the experience."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {spotlightApps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
            {spotlightApps.length === 0 ? (
              <div className="rounded-card border border-dashed border-neutral-border bg-white p-6 text-sm text-neutral-muted">
                Published apps will appear here once the admin team ships the first entries.
              </div>
            ) : null}
          </div>
        </section>

        {shelves.map((shelf) => (
          <EditorialShelfSection key={shelf.id} shelf={shelf} />
        ))}

        <section className="space-y-5">
          <SectionHeading
            eyebrow="Trending"
            title="What’s moving right now"
            description="Trending is computed from real discovery activity, not opaque model output."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {trending.rows.map((row, index) => (
              <AppCard
                key={row.app.id}
                app={row.app}
                href={`/apps/${row.app.slug}?ref=trending&position=${index + 1}`}
              />
            ))}
            {trending.rows.length === 0 ? (
              <div className="rounded-card border border-dashed border-neutral-border bg-white p-6 text-sm text-neutral-muted">
                Trending will appear here after the first recompute job runs.
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-5">
          <SectionHeading
            eyebrow="Rising"
            title="Apps gaining momentum"
            description="Rising rewards acceleration so fast movers can surface before they become obvious."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rising.rows.map((row, index) => (
              <AppCard
                key={row.app.id}
                app={row.app}
                href={`/apps/${row.app.slug}?ref=rising&position=${index + 1}`}
              />
            ))}
            {rising.rows.length === 0 ? (
              <div className="rounded-card border border-dashed border-neutral-border bg-white p-6 text-sm text-neutral-muted">
                Rising results will appear here once Cotana has enough recent activity.
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-5">
          <SectionHeading
            eyebrow="New arrivals"
            title="Recently published"
            description="Catalog listings now come directly from the database so public browsing reflects the admin publishing workflow."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {newestApps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
            {newestApps.length === 0 ? (
              <div className="rounded-card border border-dashed border-neutral-border bg-white p-6 text-sm text-neutral-muted">
                New releases will show up here after the first publish events land.
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}
