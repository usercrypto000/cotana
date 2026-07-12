import { analyticsEvents, trackServerEvent } from "@cotana/analytics";
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
import { AppCard, Badge, Button, SectionHeading } from "@cotana/ui";
import Link from "next/link";
import { StoreHeader } from "../components/store-header";
import { demoApps, uniqueDemoCategories } from "../lib/demo-catalog";

export const dynamic = "force-dynamic";

const quickIntents = [
  { label: "Earn yield", href: "/search?q=earn%20yield%20on%20stablecoins" },
  { label: "Trade", href: "/search?q=trade%20perps" },
  { label: "Borrow", href: "/search?q=borrow%20against%20crypto" },
  { label: "Payments", href: "/search?q=send%20payments" },
  { label: "Prediction markets", href: "/search?q=find%20prediction%20markets" },
  { label: "Beginner friendly", href: "/search?q=beginner%20friendly%20crypto%20apps" }
];

const banners = [
  {
    title: "Best apps for beginners",
    subtitle: "Start with trusted tools that keep the first session simple.",
    href: "/search?q=beginner%20friendly%20crypto%20apps",
    className: "cotana-banner-blue",
    apps: demoApps.slice(0, 4)
  },
  {
    title: "Stablecoin yield picks",
    subtitle: "Compare lending and yield apps without raw protocol noise.",
    href: "/search?q=earn%20yield%20on%20stablecoins",
    className: "cotana-banner-trust",
    apps: demoApps.filter((app) => app.category.slug === "lending-yield").slice(0, 4)
  },
  {
    title: "Prediction markets to watch",
    subtitle: "Find markets people are actively using and reviewing.",
    href: "/search?q=find%20prediction%20markets",
    className: "cotana-banner-blue",
    apps: demoApps.filter((app) => app.category.slug === "prediction-markets").concat(demoApps.slice(2, 5)).slice(0, 4)
  }
];

function EmptySection({ title, kind = "seed" }: { title: string; kind?: string }) {
  return (
    <div className="ui-empty-state p-4">
      <p className="font-heading text-[0.95rem] font-semibold text-brand-text">{title}</p>
      <p className="mt-1.5 text-[0.84rem] leading-[1.6]">{getEmptyStateMessage(kind)}</p>
    </div>
  );
}

function categoryHref(category: Pick<CategoryRecord, "slug">) {
  return category.slug === "all" ? "/" : `/category/${category.slug}`;
}

function discoveryApps(rows: DiscoveryAppResult[]) {
  return rows.map((row) => row.app);
}

type HomeData = {
  publishedApps: AppSummary[];
  categories: CategoryRecord[];
  shelves: PublicEditorialShelf[];
  trending: { computedAt: Date | null; rows: DiscoveryAppResult[] };
  rising: { computedAt: Date | null; rows: DiscoveryAppResult[] };
};

function emptyDiscoveryResult(): { computedAt: Date | null; rows: DiscoveryAppResult[] } {
  return { computedAt: null, rows: [] };
}

function fallbackHomeData(): HomeData {
  return {
    publishedApps: [],
    categories: uniqueDemoCategories(),
    shelves: [],
    trending: emptyDiscoveryResult(),
    rising: emptyDiscoveryResult()
  };
}

async function loadHomeData(): Promise<HomeData> {
  const dataPromise = Promise.all([
    listPublishedApps(),
    listCategories(),
    listPublicEditorialShelves({ surface: "home" }),
    listDiscoveryResults("TRENDING", { limit: 8 }),
    listDiscoveryResults("RISING", { limit: 8 })
  ]).then(([publishedApps, categories, shelves, trending, rising]) => ({
    publishedApps,
    categories,
    shelves,
    trending,
    rising
  }));

  const timeoutPromise = new Promise<HomeData>((resolve) => {
    setTimeout(() => resolve(fallbackHomeData()), 2500);
  });

  return Promise.race([dataPromise.catch(() => fallbackHomeData()), timeoutPromise]);
}

function SectionGrid({
  eyebrow,
  title,
  description,
  apps,
  emptyTitle,
  refName,
  categorySlug
}: {
  eyebrow: string;
  title: string;
  description: string;
  apps: AppSummary[];
  emptyTitle: string;
  refName?: string;
  categorySlug?: string;
}) {
  return (
    <section className="space-y-3.5">
      <SectionHeading eyebrow={eyebrow} title={title} description={description} />
      {apps.length > 0 ? (
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {apps.map((app, index) => (
            <AppCard
              key={`${title}-${app.id}`}
              app={app}
              href={
                refName
                  ? `/apps/${app.slug}?ref=${refName}${categorySlug ? `&category=${categorySlug}` : ""}&position=${index + 1}`
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        <EmptySection title={emptyTitle} />
      )}
    </section>
  );
}

function AppIconCluster({ apps }: { apps: AppSummary[] }) {
  return (
    <div className="flex -space-x-2">
      {apps.map((app) => (
        <div
          key={`${app.id}-cluster`}
          className="flex h-7 w-7 items-center justify-center rounded-[0.58rem] border border-neutral-inverse/20 bg-neutral-inverse/10 font-heading text-[0.62rem] font-semibold text-neutral-inverse shadow-sm backdrop-blur"
        >
          {app.name.slice(0, 2).toUpperCase()}
        </div>
      ))}
    </div>
  );
}

function FeaturedBanners() {
  return (
    <section className="grid gap-3 lg:grid-cols-3" aria-label="Featured discovery collections">
      {banners.map((banner) => (
        <Link
          key={banner.title}
          href={banner.href}
          className={`${banner.className} group overflow-hidden rounded-card border border-neutral-inverse/12 p-3.5 text-neutral-inverse no-underline shadow-panel transition duration-200 hover:-translate-y-0.5 hover:shadow-raised`}
        >
          <div className="flex min-h-28 flex-col justify-between gap-5">
            <div>
              <p className="font-heading text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-neutral-inverse/64">Featured</p>
              <h2 className="mt-2 max-w-sm font-heading text-[1.05rem] font-semibold leading-tight tracking-tight">{banner.title}</h2>
              <p className="mt-1 max-w-sm text-[0.78rem] leading-[1.55] text-neutral-inverse/74">{banner.subtitle}</p>
            </div>
            <div className="flex items-end justify-between gap-3">
              <AppIconCluster apps={banner.apps} />
              <span className="rounded-full bg-neutral-inverse/10 px-2 py-0.5 font-heading text-[0.66rem] font-semibold text-neutral-inverse/86 transition group-hover:bg-neutral-inverse/18">
                Browse
              </span>
            </div>
          </div>
        </Link>
      ))}
    </section>
  );
}

function SpotlightShelf({ shelf, fallbackApps }: { shelf: PublicEditorialShelf | null; fallbackApps: AppSummary[] }) {
  if (!shelf || shelf.items.length === 0) {
    return (
      <SectionGrid
        eyebrow="Curated picks"
        title="A strong starter shelf"
        description="Demo listings keep Cotana useful while the launch catalog is still filling in."
        apps={fallbackApps.slice(0, 8)}
        emptyTitle="Homepage spotlight is empty"
        refName="starter"
      />
    );
  }

  return (
    <section className="space-y-3.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          eyebrow="Spotlight"
          title={shelf.title}
          description={shelf.description}
        />
        <div className="flex flex-wrap gap-2">
          {shelf.pinned ? <Badge>Pinned</Badge> : null}
          <Badge variant="secondary">{shelf.items.length} apps</Badge>
        </div>
      </div>
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {shelf.items.slice(0, 8).map((app, index) => (
          <AppCard
            key={app.id}
            app={app}
            className="min-w-[250px] sm:min-w-[270px]"
            href={`/apps/${app.slug}?ref=shelf&shelfSlug=${shelf.slug}&position=${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

export default async function StoreHomePage() {
  const { publishedApps, categories, shelves, trending, rising } = await loadHomeData();

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

  const spotlightShelf = shelves.find((shelf) => shelf.pinned && shelf.items.length > 0) ?? shelves.find((shelf) => shelf.items.length > 0) ?? null;
  const displayApps = publishedApps.length > 0 ? publishedApps : demoApps;
  const displayCategories = categories.length > 0 ? categories : uniqueDemoCategories();
  const trendingApps = trending.rows.length > 0 ? discoveryApps(trending.rows) : demoApps.slice(0, 8);
  const risingApps =
    rising.rows.length > 0
      ? discoveryApps(rising.rows)
      : [demoApps[3], demoApps[6], demoApps[9], demoApps[5], demoApps[8], demoApps[1]].filter(
          (app): app is (typeof demoApps)[number] => Boolean(app),
        );
  const visibleCategories = displayCategories.filter((category) => category.slug !== "all");
  const categorySections = visibleCategories
    .map((category) => ({
      category,
      apps: displayApps.filter((app) => app.category.slug === category.slug).slice(0, 8)
    }))
    .filter((section) => section.apps.length > 0)
    .slice(0, 5);

  return (
    <main className="cotana-store-dark cotana-store-shell min-h-screen text-brand-text">
      <StoreHeader />
      <section className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 sm:pt-8">
        <div className="grid gap-4 pb-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-stretch">
          <div className="max-w-4xl space-y-4">
            <Badge className="w-fit border border-brand-primary/18 bg-brand-primary/10 text-brand-primary/90">Curated crypto app discovery</Badge>
            <div className="space-y-2.5">
              <h1 className="max-w-4xl font-heading text-[2.3rem] font-semibold leading-[1.05] tracking-tight text-brand-text sm:text-[2.85rem] lg:text-[3.2rem]">
                Discover the best crypto apps.
              </h1>
              <p className="max-w-2xl text-[0.94rem] leading-[1.65] text-neutral-muted">
                Find apps by what you want to do, not by chain, protocol, or dashboard noise.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="min-h-9 px-3.5">
                <Link href="/search">Try intent search</Link>
              </Button>
              <Button asChild variant="outline" className="min-h-9 px-3.5">
                <Link href="#apps">Explore apps</Link>
              </Button>
            </div>
          </div>
          <form action="/search" className="cotana-hero-panel rounded-card border border-neutral-border/80 p-3.5 shadow-panel">
            <label htmlFor="home-search" className="font-heading text-[0.8rem] font-semibold text-brand-text">
              Search by intent
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                id="home-search"
                name="q"
                placeholder="earn yield on stablecoins"
                className="min-h-10 min-w-0 flex-1 rounded-control border border-neutral-border bg-neutral-surface/90 px-3 text-[0.82rem] text-brand-text outline-none transition placeholder:text-neutral-subtle focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              />
              <Button type="submit" className="min-h-10 px-3.5">
                Search
              </Button>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {quickIntents.map((intent) => (
                <Link
                  key={intent.label}
                  href={intent.href}
                  className="rounded-full border border-neutral-border bg-neutral-surface/76 px-2.5 py-1 text-[0.72rem] text-brand-text no-underline transition hover:border-brand-primary/40 hover:bg-brand-primary/10"
                >
                  {intent.label}
                </Link>
              ))}
            </div>
          </form>
        </div>

        <FeaturedBanners />

        <nav className="flex gap-1.5 overflow-x-auto py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Store categories">
          {displayCategories.map((category) => (
            <Link key={category.slug} href={categoryHref(category)} className="shrink-0 no-underline">
              <Badge variant={category.slug === "all" ? "default" : "outline"}>{category.name}</Badge>
            </Link>
          ))}
        </nav>

        <div id="apps" className="space-y-7 pt-0">
          <SpotlightShelf shelf={spotlightShelf} fallbackApps={displayApps} />
          <SectionGrid
            eyebrow="Trending"
            title="Apps people are checking out"
            description="A fast read on the apps drawing the most attention right now."
            apps={trendingApps}
            emptyTitle="Trending is empty"
            refName="trending"
          />
          <SectionGrid
            eyebrow="Rising"
            title="Apps gaining momentum"
            description="Useful apps can surface before they become obvious."
            apps={risingApps}
            emptyTitle="Rising is empty"
            refName="rising"
          />
          {categorySections.length > 0 ? (
            categorySections.map(({ category, apps }) => (
              <SectionGrid
                key={category.slug}
                eyebrow={category.name}
                title={`${category.name} apps`}
                description="Browse polished public listings without raw registry fields or signal metrics."
                apps={apps}
                emptyTitle={`${category.name} has no apps`}
                categorySlug={category.slug}
              />
            ))
          ) : (
            <EmptySection title="Category rows are empty" kind="category" />
          )}
        </div>
      </section>
    </main>
  );
}
