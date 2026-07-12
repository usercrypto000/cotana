import Link from "next/link";
import { getEmptyStateMessage, listCategories, listPublishedApps, type CategoryRecord } from "@cotana/db";
import { AppCard, Badge, Button, Input, SectionHeading, Select } from "@cotana/ui";
import type { AppSummary, SearchSort } from "@cotana/types";
import { StoreHeader } from "../../components/store-header";
import { demoApps, uniqueDemoCategories } from "../../lib/demo-catalog";
import { getStoreOrigin } from "../../lib/origin";

type SearchPageProps = {
  searchParams: Promise<{ q?: string; category?: string; sort?: SearchSort }>;
};

export const dynamic = "force-dynamic";

type SearchFallbackData = {
  fallbackApps: AppSummary[];
  categories: CategoryRecord[];
};

function demoSearchData(category: string): SearchFallbackData {
  const apps = category === "all" ? demoApps : demoApps.filter((app) => app.category.slug === category);

  return {
    fallbackApps: apps,
    categories: uniqueDemoCategories()
  };
}

async function loadSearchFallbackData(category: string, normalizedQuery: string): Promise<SearchFallbackData> {
  const dataPromise = Promise.all([
    normalizedQuery ? Promise.resolve([]) : listPublishedApps(category === "all" ? undefined : category),
    listCategories()
  ]).then(([fallbackApps, categories]) => ({
    fallbackApps,
    categories
  }));

  const timeoutPromise = new Promise<SearchFallbackData>((resolve) => {
    setTimeout(() => resolve(demoSearchData(category)), 2500);
  });

  return Promise.race([dataPromise.catch(() => demoSearchData(category)), timeoutPromise]);
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = "", category = "all", sort = "relevance" } = await searchParams;
  const normalizedQuery = q.trim();
  const { fallbackApps, categories } = await loadSearchFallbackData(category, normalizedQuery);
  const searchResult = normalizedQuery
    ? await (async () => {
        const response = await fetch(
          `${await getStoreOrigin()}/api/search?q=${encodeURIComponent(normalizedQuery)}&category=${encodeURIComponent(category)}&sort=${encodeURIComponent(sort)}`,
          {
            cache: "no-store"
          },
        );

        if (!response.ok) {
          return null;
        }

        return (await response.json()) as {
          categoryHint: string | null;
          sort: SearchSort;
          searchEventId: string | null;
          results: Array<AppSummary & { similarity: number; score: number }>;
        };
      })()
    : null;
  const results = searchResult ? searchResult.results : fallbackApps;

  return (
    <main className="min-h-screen bg-brand-surface">
      <StoreHeader />
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-7 sm:px-6 sm:py-8">
        <SectionHeading
          eyebrow="Intent search"
          title="Search the catalog"
          description="Describe what you want to do and compare the apps that fit."
        />
        <form className="grid gap-2.5 rounded-card border border-neutral-border bg-neutral-panel p-3.5 shadow-panel lg:grid-cols-[minmax(0,1fr)_190px_190px_auto]">
          <Input
            defaultValue={q}
            name="q"
            placeholder="Search for apps by intent"
            className="h-10 flex-1 bg-neutral-surface text-[0.82rem]"
          />
          <Select
            name="category"
            defaultValue={category}
            className="h-10 bg-neutral-surface text-[0.82rem]"
          >
            {categories.map((entry) => (
              <option key={entry.slug} value={entry.slug}>
                {entry.name}
              </option>
            ))}
          </Select>
          <Select
            name="sort"
            defaultValue={sort}
            className="h-10 bg-neutral-surface text-[0.82rem]"
          >
            <option value="relevance">Relevance</option>
            <option value="highest-rated">Highest rated</option>
            <option value="most-reviewed">Most reviewed</option>
            <option value="trending">Trending</option>
            <option value="newest">Newest</option>
          </Select>
          <Button type="submit" className="h-10">Search</Button>
        </form>
        <div className="flex flex-col gap-2 text-[0.78rem] text-neutral-muted sm:flex-row sm:items-center sm:justify-between">
          <span>{results.length} result(s)</span>
          <div className="flex flex-wrap items-center gap-2">
            {searchResult?.categoryHint ? <Badge variant="secondary">Hint: {searchResult.categoryHint}</Badge> : null}
            {category !== "all" ? <Badge variant="secondary">Filter: {category}</Badge> : null}
            <Badge variant="secondary">Sort: {searchResult?.sort ?? sort}</Badge>
            <Link href="/" className="text-brand-primary">
              Back to home
            </Link>
          </div>
        </div>
        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-4">
          {results.map((app, index) => (
            <AppCard
              key={app.id}
              app={app}
              href={
                searchResult?.searchEventId
                  ? `/apps/${app.slug}?searchEventId=${searchResult.searchEventId}&position=${index + 1}`
                  : undefined
              }
            />
          ))}
          {results.length === 0 ? (
            <div className="ui-empty-state p-4 text-[0.84rem]">
              <p className="font-heading text-[0.95rem] font-semibold text-brand-text">No matching apps</p>
              <p className="mt-2">{getEmptyStateMessage("search")}</p>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
