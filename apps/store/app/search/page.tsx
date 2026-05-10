import Link from "next/link";
import { listCategories, listPublishedApps } from "@cotana/db";
import { AppCard, Badge, Button, SectionHeading } from "@cotana/ui";
import type { SearchSort } from "@cotana/types";
import { StoreHeader } from "../../components/store-header";
import { getStoreOrigin } from "../../lib/origin";

type SearchPageProps = {
  searchParams: Promise<{ q?: string; category?: string; sort?: SearchSort }>;
};

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = "", category = "all", sort = "relevance" } = await searchParams;
  const normalizedQuery = q.trim();
  const [fallbackApps, categories] = await Promise.all([
    normalizedQuery ? Promise.resolve([]) : listPublishedApps(category === "all" ? undefined : category),
    listCategories()
  ]);
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
          results: Array<
            Awaited<ReturnType<typeof listPublishedApps>>[number] & {
              similarity: number;
              score: number;
            }
          >;
        };
      })()
    : null;
  const results = searchResult ? searchResult.results : fallbackApps;

  return (
    <main>
      <StoreHeader />
      <section className="mx-auto max-w-7xl space-y-6 px-6 py-10">
        <SectionHeading
          eyebrow="Intent search"
          title="Search the catalog"
          description="Search now runs through embeddings, pgvector retrieval, and category-aware reranking."
        />
        <form className="grid gap-3 rounded-card border border-neutral-border bg-white p-5 shadow-sm lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
          <input
            defaultValue={q}
            name="q"
            placeholder="Search for apps by intent"
            className="h-12 flex-1 rounded-control border bg-neutral-surface px-4 text-sm outline-none transition focus:border-brand-primary"
          />
          <select
            name="category"
            defaultValue={category}
            className="h-12 rounded-control border bg-neutral-surface px-4 text-sm text-brand-text"
          >
            {categories.map((entry) => (
              <option key={entry.slug} value={entry.slug}>
                {entry.name}
              </option>
            ))}
          </select>
          <select
            name="sort"
            defaultValue={sort}
            className="h-12 rounded-control border bg-neutral-surface px-4 text-sm text-brand-text"
          >
            <option value="relevance">Relevance</option>
            <option value="highest-rated">Highest rated</option>
            <option value="most-reviewed">Most reviewed</option>
            <option value="trending">Trending</option>
            <option value="newest">Newest</option>
          </select>
          <Button type="submit">Search</Button>
        </form>
        <div className="flex items-center justify-between text-sm text-neutral-muted">
          <span>{results.length} result(s)</span>
          <div className="flex items-center gap-3">
            {searchResult?.categoryHint ? <Badge variant="secondary">Hint: {searchResult.categoryHint}</Badge> : null}
            {category !== "all" ? <Badge variant="secondary">Filter: {category}</Badge> : null}
            <Badge variant="secondary">Sort: {searchResult?.sort ?? sort}</Badge>
            <Link href="/" className="text-brand-primary">
              Back to home
            </Link>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
            <div className="rounded-card border border-dashed border-neutral-border bg-white p-6 text-sm text-neutral-muted">
              No apps matched that query yet.
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
