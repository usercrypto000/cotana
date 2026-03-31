import { analyticsEvents, trackServerEvent } from "@cotana/analytics";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedAppBySlug, getReviewEligibility, recordSearchClick, trackAppView } from "@cotana/db";
import { Badge, Card, CardContent, CardHeader, CardTitle, SectionHeading } from "@cotana/ui";
import { AppDetailActions } from "../../../components/app-detail-actions";
import { ReviewComposer } from "../../../components/review-composer";
import { ReviewFlagButton } from "../../../components/review-flag-button";
import { StoreHeader } from "../../../components/store-header";
import { getSessionUser } from "../../../lib/session";

type AppDetailPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ searchEventId?: string; position?: string }>;
};

export const dynamic = "force-dynamic";

export default async function AppDetailPage({ params, searchParams }: AppDetailPageProps) {
  const { slug } = await params;
  const { searchEventId, position } = await searchParams;
  const sessionUser = await getSessionUser();
  const app = await getPublishedAppBySlug(slug, sessionUser?.id);

  if (!app) {
    notFound();
  }

  if (sessionUser?.id) {
    await trackAppView(app.id, sessionUser.id);
  }

  if (searchEventId && position) {
    const parsedPosition = Number(position);

    if (Number.isFinite(parsedPosition) && parsedPosition > 0) {
      await recordSearchClick({
        searchEventId,
        appId: app.id,
        position: parsedPosition
      });

      void trackServerEvent({
        event: analyticsEvents.searchResultClicked,
        distinctId: sessionUser?.id ?? searchEventId,
        properties: {
          appId: app.id,
          searchEventId,
          position: parsedPosition
        }
      });
    }
  }

  void trackServerEvent({
    event: analyticsEvents.appDetailViewed,
    distinctId: sessionUser?.id ?? app.id,
    properties: {
      appId: app.id,
      category: app.category.slug
    }
  });

  const eligibility = sessionUser?.id ? await getReviewEligibility(sessionUser.id, app.id) : null;
  const normalizedEligibility = eligibility
    ? {
        ...eligibility,
        nextEligibleAt: eligibility.nextEligibleAt?.toISOString() ?? null
      }
    : null;

  return (
    <main>
      <StoreHeader />
      <section className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <div className="grid gap-8 rounded-[2rem] border bg-white p-8 shadow-sm lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                <Image
                  src={app.logoUrl}
                  alt={`${app.name} logo`}
                  width={48}
                  height={48}
                  unoptimized
                  className="h-12 w-12 rounded-2xl object-cover"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{app.name}</h1>
                  {app.verified ? <Badge>Verified</Badge> : null}
                </div>
                <p className="text-base text-slate-600">{app.shortDescription}</p>
              </div>
            </div>
            <p className="max-w-3xl text-base leading-7 text-slate-600">{app.longDescription}</p>
            <AppDetailActions
              appId={app.id}
              initiallyLiked={app.likedByCurrentUser}
              initiallySaved={app.savedByCurrentUser}
              initialLikeCount={app.likeCount}
              canInteract={Boolean(sessionUser)}
            />
            {app.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {app.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
            {app.screenshots.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {app.screenshots.map((screenshot) => (
                  <div key={screenshot.id} className="overflow-hidden rounded-[1.5rem] border bg-slate-50">
                    <Image
                      src={screenshot.imageUrl}
                      alt={`${app.name} screenshot`}
                      width={1200}
                      height={720}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="space-y-4 rounded-[1.5rem] bg-slate-950 p-6 text-white">
            <SectionHeading
              eyebrow="App snapshot"
              title="Consumer-native detail view"
              description="No wallets, no chain tags, and no metrics overload on the consumer surface."
              inverse
            />
            <div className="grid gap-3 text-sm text-white/80">
              <div className="rounded-2xl bg-white/10 p-4">Category: {app.category.name}</div>
              <div className="rounded-2xl bg-white/10 p-4">
                Rating: {app.rating.toFixed(1)}/5 from {app.reviewCount} reviews
              </div>
              <div className="rounded-2xl bg-white/10 p-4">Likes: {app.likeCount}</div>
              <div className="rounded-2xl bg-white/10 p-4">
                <Link href={app.websiteUrl} className="text-emerald-200 underline underline-offset-4">
                  Visit website
                </Link>
              </div>
            </div>
          </div>
        </div>
        <ReviewComposer appId={app.id} canReview={Boolean(sessionUser)} eligibility={normalizedEligibility} />
        <section className="space-y-5">
          <SectionHeading
            eyebrow="Community"
            title="Recent reviews"
            description="Reviews publish immediately when platform-native eligibility rules are met."
          />
          {app.reviews.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No reviews yet</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">
                  Be the first eligible user to share a thoughtful review for this app.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {app.reviews.map((review) => (
                <Card key={review.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <CardTitle>{review.user.displayName ?? "Cotana user"}</CardTitle>
                      <p className="mt-1 text-sm text-slate-500">
                        {review.rating}/5 · {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ReviewFlagButton reviewId={review.id} canFlag={Boolean(sessionUser)} />
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-6 text-slate-700">{review.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
