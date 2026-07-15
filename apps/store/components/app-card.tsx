import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import type { AppSummary } from "@cotana/types";
import { normalizeTrustMetadata } from "@cotana/types";
import { cn } from "@cotana/ui";

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
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[0.72rem] border border-[#1F2937] bg-[#161B26] font-heading text-[0.8rem] font-semibold text-[#84CC16] shadow-sm">
      {app.logoUrl ? (
        <Image
          src={app.logoUrl}
          alt={`${app.name} logo`}
          width={48}
          height={48}
          unoptimized
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="relative z-10">{initials || app.name.slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  const roundedRating = Math.round(rating || 0);
  
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star 
          key={i} 
          className={cn(
            "h-3.5 w-3.5",
            i < roundedRating ? "fill-[#FBBF24] text-[#FBBF24]" : "fill-transparent text-[#9CA3AF]/30"
          )} 
        />
      ))}
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
  const trustMetadata = normalizeTrustMetadata(app.trustMetadata, { verified: app.verified });

  return (
    <Link href={href ?? `/apps/${app.slug}`} className={cn("group block h-full no-underline", className)}>
      <div className="h-full flex flex-col min-h-[160px] overflow-hidden rounded-2xl border border-[#1F2937] bg-[#161B26] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#84CC16]/50 hover:shadow-[0_0_15px_rgba(132,204,22,0.15)] focus-within:border-[#84CC16]">
        <div className="flex items-start gap-3">
          <AppLogo app={app} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="truncate font-heading text-[1rem] font-semibold tracking-tight text-[#F9FAFB]">{app.name}</h3>
              {app.verified && (
                <span className="inline-flex shrink-0 items-center rounded-full bg-[#84CC16]/15 px-2 py-0.5 text-[0.65rem] font-bold text-[#84CC16] uppercase tracking-wider">
                  Verified
                </span>
              )}
              {!app.verified && trustMetadata.verificationStatus === "experimental" && (
                <span className="inline-flex shrink-0 items-center rounded-full bg-[#F59E0B]/15 px-2 py-0.5 text-[0.65rem] font-bold text-[#F59E0B] uppercase tracking-wider">
                  Experimental
                </span>
              )}
            </div>
            <p className="mt-1.5 line-clamp-2 text-[0.82rem] leading-[1.5] text-[#9CA3AF]">
              {truncateWords(app.shortDescription || "Curated app listing", 12)}
            </p>
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <span className="rounded-full bg-[#0B0F19] border border-[#1F2937] px-2.5 py-1 text-[0.7rem] font-medium text-[#9CA3AF] truncate max-w-[50%]">
            {app.category.name}
          </span>
          <StarRating rating={app.rating} />
        </div>
      </div>
    </Link>
  );
}
