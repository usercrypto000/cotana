import { notFound } from "next/navigation";
import { listCategories, listPublishedApps } from "@cotana/db";
import { AppCard, SectionHeading } from "@cotana/ui";
import { StoreHeader } from "../../../components/store-header";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const categories = await listCategories();
  const category = categories.find((entry) => entry.slug === slug);

  if (!category) {
    notFound();
  }

  const apps = await listPublishedApps(slug);

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
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
              No published apps are live in this category yet.
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
