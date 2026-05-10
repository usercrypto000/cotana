import Link from "next/link";
import { storeCategories } from "@cotana/config";
import { Badge } from "@cotana/ui";
import { StoreAuthControls } from "./store-auth-controls";

export function StoreHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-border bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        <div>
          <Link href="/" className="font-heading text-lg font-semibold tracking-tight text-brand-primary">
            Cotana
          </Link>
          <p className="text-sm text-neutral-muted">Discover apps by intent, not noise.</p>
        </div>
        <nav className="hidden items-center gap-2 lg:flex">
          {storeCategories.slice(0, 6).map((category) => (
            <Link key={category.slug} href={category.slug === "all" ? "/" : `/category/${category.slug}`}>
              <Badge variant="secondary">{category.name}</Badge>
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm text-brand-text">
          <Link href="/search">Search</Link>
          <Link href="/library">My Library</Link>
          <Link href="/profile">Profile</Link>
          <StoreAuthControls />
        </div>
      </div>
    </header>
  );
}
