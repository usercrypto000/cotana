import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Star } from "lucide-react";
import type { AppSummary } from "@cotana/types";
import { normalizeTrustMetadata } from "@cotana/types";
import { cn } from "../lib/utils";
import { Badge } from "./badge";
import { Card, CardContent } from "./card";

const trustLabels = {
  verified: "Verified",
  reviewed: "Reviewed",
  unreviewed: "Unreviewed",
  experimental: "Experimental"
};

const trustStyles = {
  verified: "border-trust-ready/35 bg-trust-ready-soft text-trust-ready-ink",
  reviewed: "border-brand-primary/30 bg-brand-primary/10 text-brand-primary",
  unreviewed: "border-neutral-border/70 bg-neutral-surface/72 text-neutral-muted",
  experimental: "border-trust-agent/30 bg-trust-agent-soft text-trust-agent-ink"
};

function truncateWords(input: string, maxWords: number) {
  const words = input.trim().split(/\s+/).filter(Boolean);
  return words.length <= maxWords ? input.trim() : `${words.slice(0, maxWords).join(" ")}...`;
}

function AppLogo({ app }: { app: AppSummary }) {
  const initials = app.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[0.72rem] border border-neutral-border bg-gradient-to-br from-brand-primary/14 via-neutral-surface to-trust-agent/12 font-heading text-[0.74rem] font-semibold text-brand-primary shadow-sm">
      {app.logoUrl ? (
        <Image
          src={app.logoUrl}
          alt={`${app.name} logo`}
          width={40}
          height={40}
          unoptimized
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="relative z-10">{initials || app.name.slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
}

export function AppCard({
  app,
  href,
  className
}: {
  app: AppSummary;
  href?: string;
  className?: string;
}) {
  const trustMetadata = normalizeTrustMetadata(app.trustMetadata, {
    verified: app.verified
  });

  return (
    <Link href={href ?? `/apps/${app.slug}`} className={cn("group block h-full no-underline", className)}>
      <Card className="h-full min-h-[148px] overflow-hidden bg-neutral-panel/88 transition duration-200 hover:-translate-y-0.5 hover:border-brand-primary/28 hover:bg-neutral-surface/90 hover:shadow-raised focus-within:border-brand-primary/50">
        <CardContent className="flex h-full flex-col p-3.5">
          <div className="flex items-start gap-2.5">
            <AppLogo app={app} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <h3 className="truncate font-heading text-[0.9rem] font-semibold tracking-tight text-brand-text">{app.name}</h3>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 font-heading text-[0.58rem] font-semibold",
                    trustStyles[trustMetadata.verificationStatus],
                  )}
                >
                  <ShieldCheck aria-hidden className="h-2.5 w-2.5" />
                  {trustLabels[trustMetadata.verificationStatus]}
                </span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-[0.78rem] leading-[1.45] text-neutral-muted">
                {truncateWords(app.shortDescription || "Curated app listing", 10)}
              </p>
            </div>
          </div>
          <div className="mt-auto flex items-center justify-between gap-3 pt-3 text-[0.78rem]">
            <Badge variant="secondary" className="max-w-[62%] truncate border border-neutral-border/60 bg-neutral-surface/64 text-neutral-muted">
              {app.category.name}
            </Badge>
            <div className="flex shrink-0 items-center gap-1.5 text-brand-text">
              <Star className="h-3.5 w-3.5 fill-brand-accent/22 text-brand-accent" />
              <span className="font-heading font-medium">{app.rating > 0 ? app.rating.toFixed(1) : "New"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
