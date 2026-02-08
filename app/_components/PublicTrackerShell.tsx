import Link from "next/link";
import type { ReactNode } from "react";

type NavKey = "overview" | "incidents" | "status" | "methodology";

const NAV_ITEMS: Array<{ href: string; label: string; key: NavKey }> = [
  { href: "/", label: "Overview", key: "overview" },
  { href: "/incidents", label: "Incidents", key: "incidents" },
  { href: "/status", label: "Status", key: "status" },
  { href: "/methodology", label: "Methodology", key: "methodology" },
];

export function PublicTrackerShell(props: {
  title: string;
  subtitle: string;
  activeNav: NavKey;
  children: ReactNode;
}) {
  const { title, subtitle, activeNav, children } = props;

  return (
    <main className="ht-root">
      <section className="ht-hero" aria-label="Cotana Hack Tracker">
        <div className="ht-hero-grid" />
        <div className="ht-hero-copy">
          <p className="ht-kicker">Cotana Hack Tracker</p>
          <h1 className="ht-title">{title}</h1>
          <p className="ht-subtitle">{subtitle}</p>
        </div>
      </section>

      <nav className="ht-sticky-nav" aria-label="Primary">
        <div className="ht-sticky-nav-inner">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={item.key === activeNav ? "ht-nav-link active" : "ht-nav-link"}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <section className="ht-content">{children}</section>

      <footer className="ht-footer" aria-label="Footer">
        <div className="ht-footer-inner">
          <div className="ht-footer-links">
            <Link href="/methodology" className="ht-footer-link">
              Methodology
            </Link>
            <Link href="/status" className="ht-footer-link">
              Status
            </Link>
          </div>
          <div className="ht-footer-meta">Cotana Hack Tracker</div>
        </div>
      </footer>
    </main>
  );
}
