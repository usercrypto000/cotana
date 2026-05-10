import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Star } from "lucide-react";
import type { AppSummary } from "@cotana/types";
import { cn } from "../lib/utils";
import { Badge } from "./badge";
import { Card, CardContent } from "./card";

function truncateWords(input: string, maxWords: number) {
  const words = input.trim().split(/\s+/);
  return words.length <= maxWords ? input : `${words.slice(0, maxWords).join(" ")}...`;
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
  return (
    <Link href={href ?? `/apps/${app.slug}`} className={cn("group block", className)}>
      <Card className="h-full bg-white transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <CardContent className="flex h-full flex-col gap-5 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-card bg-neutral-surface font-heading text-2xl font-semibold text-brand-text">
                <Image
                  src={app.logoUrl}
                  alt={`${app.name} logo`}
                  width={40}
                  height={40}
                  unoptimized
                  className="h-10 w-10 rounded-card object-cover"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-heading text-base font-semibold tracking-tight text-brand-text">{app.name}</h3>
                  {app.verified ? <CheckCircle2 className="h-4 w-4 text-trust-ready" /> : null}
                </div>
                <p className="text-sm text-neutral-muted">{truncateWords(app.shortDescription, 5)}</p>
              </div>
            </div>
            <Badge variant="secondary">{app.category.name}</Badge>
          </div>
          <div className="mt-auto flex items-center justify-between text-sm text-neutral-muted">
            <div className="flex items-center gap-1.5 text-brand-text">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-heading font-medium">{app.rating.toFixed(1)}/5</span>
            </div>
            <span>{app.reviewCount} reviews</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
