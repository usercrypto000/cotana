import Link from "next/link";
import { listPublishedApps } from "@cotana/db";
import { AppCard, Badge, Button, SectionHeading } from "@cotana/ui";
import { StoreHeader } from "../../components/store-header";
import { getStoreOrigin } from "../../lib/origin";

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = "" } = await searchParams;
  const normalizedQuery = q.trim();
  const fallbackApps = normalizedQuery ? [] : await listPublishedApps();
  const searchResult = normalizedQuery
    ? await (async () => {
        const response = await fetch(`${await getStoreOrigin()}/api/search?q=${encodeURIComponent(normalizedQuery)}`, {
          cache: "no-store"
        });

        if (!response.ok) {
          return null;
        }

        return (await response.json()) as {
          categoryHint: string | null;
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
        <form className="flex flex-col gap-3 rounded-[1.5rem] border bg-white p-5 shadow-sm sm:flex-row">
          <input
            defaultValue={q}
            name="q"
            placeholder="Search for apps by intent"
            className="h-12 flex-1 rounded-xl border bg-slate-50 px-4 text-sm outline-none transition focus:border-teal-700"
          />
          <Button type="submit">Search</Button>
        </form>
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{results.length} result(s)</span>
          <div className="flex items-center gap-3">
            {searchResult?.categoryHint ? <Badge variant="secondary">Hint: {searchResult.categoryHint}</Badge> : null}
            <Link href="/" className="text-teal-800">
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
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
              No apps matched that query yet.
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
