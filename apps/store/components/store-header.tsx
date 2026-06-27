"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { storeCategories } from "@cotana/config";
import { Badge, Button, cn } from "@cotana/ui";
import { StoreAuthControls } from "./store-auth-controls";

export function StoreHeader() {
  const pathname = usePathname();
  const primaryLinks = [
    { href: "/search", label: "Search" },
    { href: "/library", label: "My Library", hideOnMobile: true },
    { href: "/profile", label: "Profile", hideOnMobile: true }
  ];

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-border/70 bg-brand-surface/88 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-[0.72rem] bg-brand-primary font-heading text-[0.95rem] font-bold tracking-tight text-neutral-inverse shadow-panel ring-1 ring-neutral-inverse/10"
            aria-label="Cotana home"
          >
            C
          </Link>
          <div>
            <Link href="/" className="font-heading text-[0.95rem] font-semibold tracking-tight text-brand-text no-underline">
              Cotana
            </Link>
            <p className="hidden font-body text-[0.72rem] text-neutral-muted sm:block">Apps by intent, not protocol noise.</p>
          </div>
        </div>
        <nav
          className="order-3 flex w-full gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:order-none lg:w-auto lg:max-w-[42rem] lg:items-center lg:pb-0"
          aria-label="Primary categories"
        >
          {storeCategories.slice(0, 6).map((category) => (
            <Link
              key={category.slug}
              href={category.slug === "all" ? "/" : `/category/${category.slug}`}
              className="shrink-0 no-underline"
            >
              <Badge
                variant={isActive(category.slug === "all" ? "/" : `/category/${category.slug}`) ? "default" : "outline"}
                className="transition hover:border-brand-primary/30 hover:bg-brand-primary/8"
              >
                {category.name}
              </Badge>
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5 font-heading text-[0.78rem]">
          {primaryLinks.map((link) => (
            <Button
              key={link.href}
              asChild
              variant={isActive(link.href) ? "secondary" : "outline"}
              className={cn("h-8 px-2.5 shadow-none", link.hideOnMobile ? "hidden sm:inline-flex" : "")}
            >
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
          <StoreAuthControls />
        </div>
      </div>
    </header>
  );
}
