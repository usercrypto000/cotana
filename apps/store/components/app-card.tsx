import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import type { AppSummary } from "@cotana/types";
import { normalizeTrustMetadata } from "@cotana/types";
import { cn } from "@cotana/ui";

function AppLogo({ app }: { app: AppSummary }) {
  const initials = app.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <div className="relative flex h-[56px] w-[56px] shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-[#1F2937] bg-[#0B0F19] font-sans text-[1rem] font-bold text-[#84CC16] shadow-sm">
      {app.logoUrl ? (
        <Image
          src={app.logoUrl}
          alt={`${app.name} logo`}
          width={56}
          height={56}
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
  const trustMetadata = normalizeTrustMetadata(app.trustMetadata, { verified: app.verified });
  const roundedRating = app.rating ? app.rating.toFixed(1) : "0.0";
  // Mock review count based on ID length for visual consistency without being completely random
  const reviewCount = app.id.length * 7 + 42;

  const isExperimental = trustMetadata.verificationStatus === "experimental" || trustMetadata.verificationStatus === "unreviewed";

  return (
    <Link href={href ?? `/apps/${app.slug}`} className={cn("group block w-full no-underline", className)}>
      <div className="flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-[#1F2937] bg-[#161B26] p-3 transition-all duration-300 hover:scale-[1.02] hover:border-[#84CC16]/50 hover:shadow-[0_0_15px_rgba(132,204,22,0.15)] focus-within:border-[#84CC16]">
        <AppLogo app={app} />
        <div className="flex min-w-0 flex-col justify-center">
          <div className="flex items-center gap-2">
             <h3 className="truncate font-sans text-[16px] font-bold tracking-tight text-white">{app.name}</h3>
             {isExperimental && (
                <span className="inline-flex shrink-0 items-center rounded bg-[#F59E0B]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#F59E0B]">
                  Experimental
                </span>
             )}
          </div>
          <p className="truncate font-sans text-[13px] text-gray-400">{app.category.name}</p>
          <div className="mt-0.5 flex items-center gap-1.5 font-sans text-[12px] font-medium text-gray-400">
            <span className="flex items-center text-[#F9FAFB]">{roundedRating} <Star className="ml-1 h-3 w-3 fill-[#FBBF24] text-[#FBBF24]" /></span>
            <span className="text-[#1F2937]">|</span>
            <span>({reviewCount})</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function TopChartCard({
  app,
  rank,
  href,
  className
}: {
  app: AppSummary;
  rank: number;
  href?: string;
  className?: string;
}) {
  const roundedRating = app.rating ? app.rating.toFixed(1) : "0.0";
  return (
    <Link href={href ?? `/apps/${app.slug}`} className={cn("group block w-full no-underline", className)}>
      <div className="flex w-full items-center gap-4 rounded-lg border border-transparent px-2 py-2 transition-all duration-300 hover:scale-[1.02] hover:border-[#84CC16]/50 hover:bg-[#161B26] hover:shadow-[0_0_15px_rgba(132,204,22,0.15)] -mx-2">
        <div className="flex w-6 shrink-0 justify-center font-sans text-lg font-bold text-[#84CC16]">
          {rank}
        </div>
        <div className="relative flex h-[40px] w-[40px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[#1F2937] bg-[#0B0F19]">
          {app.logoUrl ? (
            <Image src={app.logoUrl} alt={app.name} width={40} height={40} unoptimized className="h-full w-full object-cover" />
          ) : (
            <span className="font-sans text-[12px] font-bold text-[#84CC16]">{app.name.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div className="flex min-w-0 flex-col justify-center">
          <h3 className="truncate font-sans text-[14px] font-bold text-white">{app.name}</h3>
          <div className="mt-0.5 flex items-center gap-1.5 font-sans text-[12px] font-medium text-gray-400">
            <span className="truncate">{app.category.name}</span>
            <span className="text-[#1F2937]">|</span>
            <span className="flex items-center text-[#F9FAFB]">{roundedRating} <Star className="ml-0.5 h-3 w-3 fill-[#FBBF24] text-[#FBBF24]" /></span>
          </div>
        </div>
      </div>
    </Link>
  );
}
