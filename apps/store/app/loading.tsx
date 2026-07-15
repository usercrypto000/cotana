import { StoreHeader } from "../components/store-header";

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={`flex w-full animate-pulse items-center gap-4 rounded-2xl border border-[#1F2937] bg-gradient-to-r from-[#161B26] to-[#1F2937] p-3 ${className}`}>
      <div className="h-[56px] w-[56px] shrink-0 rounded-[12px] bg-[#1F2937]" />
      <div className="flex w-full flex-col justify-center gap-2">
        <div className="h-4 w-3/4 rounded bg-[#1F2937]" />
        <div className="h-3 w-1/2 rounded bg-[#1F2937]" />
        <div className="h-3 w-1/3 rounded bg-[#1F2937]" />
      </div>
    </div>
  );
}

function SkeletonTopChartCard() {
  return (
    <div className="flex w-full animate-pulse items-center gap-4 rounded-lg px-2 py-2">
      <div className="h-6 w-6 shrink-0 rounded bg-[#1F2937]" />
      <div className="h-[40px] w-[40px] shrink-0 rounded-[10px] bg-[#1F2937]" />
      <div className="flex w-full flex-col justify-center gap-2">
        <div className="h-3 w-2/3 rounded bg-[#1F2937]" />
        <div className="h-3 w-1/2 rounded bg-[#1F2937]" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <main className="cotana-store-dark cotana-store-shell min-h-screen text-brand-text">
      <StoreHeader />
      <section className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:pt-8 md:px-8">
        
        {/* Hero Section Skeleton */}
        <div className="grid gap-4 pb-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-stretch">
          <div className="relative flex h-[280px] animate-pulse flex-col justify-end overflow-hidden rounded-2xl border border-[#1F2937] bg-gradient-to-r from-[#161B26] to-[#1F2937] p-6 sm:p-8" />
          <div className="flex h-[280px] animate-pulse flex-col justify-between rounded-2xl border border-[#1F2937] bg-gradient-to-r from-[#161B26] to-[#1F2937] p-6" />
        </div>

        {/* Feature Banners Skeleton */}
        <div className="grid gap-3 pb-5 lg:grid-cols-3">
           {[...Array(3)].map((_, i) => (
             <div key={i} className="h-36 animate-pulse rounded-2xl border border-[#1F2937] bg-gradient-to-r from-[#161B26] to-[#1F2937]" />
           ))}
        </div>
        
        {/* Categories Skeleton */}
        <div className="flex gap-2 overflow-x-auto py-5">
           {[...Array(6)].map((_, i) => (
             <div key={i} className="h-8 w-24 shrink-0 animate-pulse rounded-full border border-[#1F2937] bg-gradient-to-r from-[#161B26] to-[#1F2937]" />
           ))}
        </div>

        <div className="pt-0">
          {/* Spotlight Shelf Skeleton (Wide horizontal) */}
          <section className="mb-10 space-y-6">
            <div className="h-8 w-1/3 animate-pulse rounded bg-[#1F2937]" />
            <div className="flex flex-row overflow-x-hidden gap-6 pb-4">
              {[...Array(4)].map((_, i) => (
                <SkeletonCard key={i} className="w-[340px] shrink-0" />
              ))}
            </div>
          </section>

          {/* Top Charts Skeleton */}
          <section className="mb-10 space-y-6 border-t border-slate-900/50 py-5">
            <div className="h-8 w-1/3 animate-pulse rounded bg-[#1F2937]" />
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {[...Array(3)].map((_, col) => (
                <div key={col}>
                  <div className="mb-4 h-4 w-1/4 animate-pulse rounded bg-[#1F2937]" />
                  <div className="flex flex-col gap-2">
                    {[...Array(3)].map((_, i) => (
                      <SkeletonTopChartCard key={i} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Rising Skeleton (Compact horizontal) */}
          <section className="mb-10 space-y-6 border-t border-slate-900/50 py-5">
            <div className="h-8 w-1/3 animate-pulse rounded bg-[#1F2937]" />
            <div className="flex flex-row overflow-x-hidden gap-4 pb-4">
              {[...Array(5)].map((_, i) => (
                <SkeletonCard key={i} className="w-[260px] shrink-0" />
              ))}
            </div>
          </section>

          {/* Category Shelf Skeleton (Grid) */}
          <section className="mb-10 space-y-6 border-t border-slate-900/50 py-5">
            <div className="h-8 w-1/3 animate-pulse rounded bg-[#1F2937]" />
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
