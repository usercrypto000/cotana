import Link from "next/link";
import type { PublicEditorialShelf } from "@cotana/db";
import { AppCard, Badge, SectionHeading } from "@cotana/ui";

export function EditorialShelfSection({ shelf }: { shelf: PublicEditorialShelf }) {
  return (
    <section className="space-y-5">
      <SectionHeading
        eyebrow={shelf.category?.name ?? "Editorial"}
        title={shelf.title}
        description={shelf.description}
      />
      <div className="flex flex-wrap gap-2">
        {shelf.pinned ? <Badge>Pinned</Badge> : null}
        {shelf.category ? (
          <Link href={`/category/${shelf.category.slug}`}>
            <Badge variant="secondary">{shelf.category.name}</Badge>
          </Link>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shelf.items.map((app, index) => (
          <AppCard
            key={app.id}
            app={app}
            href={`/apps/${app.slug}?ref=shelf&shelfSlug=${shelf.slug}&position=${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
