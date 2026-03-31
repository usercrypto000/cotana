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
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
          <div>
            <Link href="/" className="text-lg font-semibold text-white">
              Cotana Admin
            </Link>
            <p className="text-sm text-slate-400">Curated operations for the public catalog.</p>
          </div>
          <div className="flex items-center gap-3">
            <nav className="flex flex-wrap items-center gap-2">
              {adminNavigation.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Badge variant="outline">{item.label}</Badge>
                </Link>
              ))}
            </nav>
            <AdminAuthControls />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-10">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">Internal dashboard</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white">{title}</h1>
          <p className="max-w-3xl text-base text-slate-400">{description}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
