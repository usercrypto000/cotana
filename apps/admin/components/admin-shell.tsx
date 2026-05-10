import Link from "next/link";
import { adminNavigation } from "@cotana/config";
import { Badge } from "@cotana/ui";
import { AdminAuthControls } from "./admin-auth-controls";

export function AdminShell({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
          <div>
            <Link href="/" className="font-heading text-lg font-semibold text-brand-primary">
              Cotana Admin
            </Link>
            <p className="text-sm text-neutral-muted">Curated operations for the public catalog.</p>
          </div>
          <div className="flex items-center gap-3">
            <nav className="flex flex-wrap items-center gap-2">
              {adminNavigation.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Badge variant={item.href.includes("registry") || item.href.includes("discovery") ? "agent" : "outline"}>
                    {item.label}
                  </Badge>
                </Link>
              ))}
            </nav>
            <AdminAuthControls />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-10">
        <div className="space-y-2">
          <p className="font-heading text-sm uppercase tracking-[0.16em] text-brand-primary">Internal dashboard</p>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-brand-text">{title}</h1>
          <p className="max-w-3xl text-base text-neutral-muted">{description}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
