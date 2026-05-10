import { analyticsEvents, trackServerEvent } from "@cotana/analytics";
import { getSimilarApps } from "@cotana/search";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAgentCapabilityQualitySignals,
  getPublishedAppBySlug,
  getReviewEligibility,
  listAppUpdates,
  recordSearchClick,
  trackAppView
} from "@cotana/db";
import { Badge, Card, CardContent, CardHeader, CardTitle, SectionHeading } from "@cotana/ui";
import { AppTrustBadges } from "../../../components/app-trust-badges";
import { AppDetailActions } from "../../../components/app-detail-actions";
import { ReviewComposer } from "../../../components/review-composer";
import { ReviewFlagButton } from "../../../components/review-flag-button";
import { StoreHeader } from "../../../components/store-header";
import { getSessionUser } from "../../../lib/session";

type AppDetailPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    searchEventId?: string;
    position?: string;
    ref?: string;
    shelfSlug?: string;
    sourceAppId?: string;
    category?: string;
    update?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function AppDetailPage({ params, searchParams }: AppDetailPageProps) {
  const { slug } = await params;
  const { searchEventId, position, ref, shelfSlug, sourceAppId, category, update } = await searchParams;
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

  if (ref === "shelf") {
    void trackServerEvent({
      event: analyticsEvents.shelfAppClicked,
      distinctId: sessionUser?.id ?? app.id,
      properties: {
        appId: app.id,
        shelfSlug: shelfSlug ?? null,
        position: position ? Number(position) : null
      }
    });
  }

  if (ref === "trending") {
    void trackServerEvent({
      event: analyticsEvents.trendingAppClicked,
      distinctId: sessionUser?.id ?? app.id,
      properties: {
        appId: app.id,
        category: category ?? app.category.slug,
        position: position ? Number(position) : null
      }
    });
  }

  if (ref === "rising") {
    void trackServerEvent({
      event: analyticsEvents.risingAppClicked,
      distinctId: sessionUser?.id ?? app.id,
      properties: {
        appId: app.id,
        category: category ?? app.category.slug,
        position: position ? Number(position) : null
      }
    });
  }

  if (ref === "similar") {
    void trackServerEvent({
      event: analyticsEvents.similarAppClicked,
      distinctId: sessionUser?.id ?? app.id,
      properties: {
        appId: app.id,
        sourceAppId: sourceAppId ?? null,
        position: position ? Number(position) : null
      }
    });
  }

  const eligibility = sessionUser?.id ? await getReviewEligibility(sessionUser.id, app.id) : null;
  const normalizedEligibility = eligibility
    ? {
        ...eligibility,
        nextEligibleAt: eligibility.nextEligibleAt?.toISOString() ?? null
      }
    : null;
  const [similarApps, updates] = await Promise.all([
    getSimilarApps(app.id, {
      limit: 4,
      boostSameCategory: true
    }),
    listAppUpdates(app.id)
  ]);

  if (updates.length > 0) {
    void trackServerEvent({
      event: analyticsEvents.changelogViewed,
      distinctId: sessionUser?.id ?? app.id,
      properties: {
        appId: app.id,
        itemCount: updates.length
      }
    });
  }

  if (update) {
    void trackServerEvent({
      event: analyticsEvents.changelogItemClicked,
      distinctId: sessionUser?.id ?? app.id,
      properties: {
        appId: app.id,
        updateId: update
      }
    });
  }

  if (app.verified) {
    void trackServerEvent({
      event: analyticsEvents.verifiedBadgeSeen,
      distinctId: sessionUser?.id ?? app.id,
      properties: {
        appId: app.id
      }
    });
  }

  if (app.communityPick) {
    void trackServerEvent({
      event: analyticsEvents.communityPickBadgeSeen,
      distinctId: sessionUser?.id ?? app.id,
      properties: {
        appId: app.id
      }
    });
  }

  return (
    <main>
      <StoreHeader />
      <section className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <div className="grid gap-8 rounded-card border border-neutral-border bg-white p-8 shadow-sm lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-card bg-neutral-surface text-3xl">
                <Image
                  src={app.logoUrl}
                  alt={`${app.name} logo`}
                  width={48}
                  height={48}
                  unoptimized
                  className="h-12 w-12 rounded-card object-cover"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h1 className="font-heading text-3xl font-semibold tracking-tight text-brand-text">{app.name}</h1>
                  <AppTrustBadges verified={app.verified} communityPick={app.communityPick} />
                </div>
                <p className="text-base text-neutral-muted">{app.shortDescription}</p>
              </div>
            </div>
            <p className="max-w-3xl text-base leading-7 text-neutral-muted">{app.longDescription}</p>
            {app.agentListingStatus === "PUBLISHED" ? (
              <div className="rounded-card border border-violet-200 bg-violet-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="agent">Machine-readable</Badge>
                  <span className="font-heading text-sm font-medium text-violet-950">
                    {app.agentAudience === "HYBRID" ? "Built for people and AI agents" : "Built for AI agents"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="secondary">Discovery only</Badge>
                  {app.agentCapabilities.some((capability) => capability.interactionMode === "READ_ONLY") ? (
                    <Badge variant="ready">Read-only capability</Badge>
                  ) : null}
                  {app.agentCapabilities.some((capability) => getAgentCapabilityQualitySignals(capability).schemaComplete) ? (
                    <Badge variant="ready">Schema available</Badge>
                  ) : null}
                  {app.agentCapabilities.some((capability) => getAgentCapabilityQualitySignals(capability).safetyNotesPresent) ? (
                    <Badge variant="ready">Safety notes available</Badge>
                  ) : null}
                  {app.agentCapabilities.some((capability) => getAgentCapabilityQualitySignals(capability).docsAvailable) ? (
                    <Badge variant="ready">Docs available</Badge>
                  ) : null}
                </div>
                {app.agentSummary ? <p className="mt-3 text-sm leading-6 text-violet-950/75">{app.agentSummary}</p> : null}
              </div>
            ) : null}
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
                  <div key={screenshot.id} className="overflow-hidden rounded-card border border-neutral-border bg-neutral-surface">
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
          <div className="space-y-4 rounded-card bg-brand-primary p-6 text-white">
            <SectionHeading
              eyebrow="App snapshot"
              title="Consumer-native detail view"
              description="No wallets, no chain tags, and no metrics overload on the consumer surface."
              inverse
            />
            <div className="grid gap-3 text-sm text-white/80">
              <div className="rounded-card bg-white/10 p-4">Category: {app.category.name}</div>
              <div className="rounded-card bg-white/10 p-4">
                Rating: {app.rating.toFixed(1)}/5 from {app.reviewCount} reviews
              </div>
              <div className="rounded-card bg-white/10 p-4">Likes: {app.likeCount}</div>
              <div className="rounded-card bg-white/10 p-4">
                <Link href={app.websiteUrl} className="text-lime-200 underline underline-offset-4">
                  Visit website
                </Link>
              </div>
            </div>
          </div>
        </div>
        {app.agentListingStatus === "PUBLISHED" ? (
          <section className="space-y-5">
            <SectionHeading
              eyebrow="Agent access"
              title="Capabilities"
              description="Machine-readable capabilities for assistants, workflows, and automated discovery."
            />
            {app.agentCapabilities.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No active capabilities yet</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500">
                    Agent access has been marked for this app, but active capabilities are still being configured.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {app.agentCapabilities.map((capability) => (
                  <Card key={capability.id}>
                    <CardHeader>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle>{capability.name}</CardTitle>
                        <Badge variant="secondary">{capability.capabilityType}</Badge>
                        <Badge variant="agent">{capability.authType}</Badge>
                        <Badge variant="secondary">{capability.interfaceType}</Badge>
                        <Badge variant="secondary">{capability.interactionMode}</Badge>
                        <Badge variant={getAgentCapabilityQualitySignals(capability).qualityScore >= 80 ? "ready" : "warning"}>
                          {getAgentCapabilityQualitySignals(capability).qualityScore}/100 quality
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm leading-6 text-slate-700">{capability.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {getAgentCapabilityQualitySignals(capability).schemaComplete ? (
                          <Badge variant="ready">Schema available</Badge>
                        ) : null}
                        {getAgentCapabilityQualitySignals(capability).safetyNotesPresent ? (
                          <Badge variant="ready">Safety notes</Badge>
                        ) : null}
                        {getAgentCapabilityQualitySignals(capability).docsAvailable ? (
                          <Badge variant="ready">Docs</Badge>
                        ) : null}
                        {getAgentCapabilityQualitySignals(capability).interactionSafety === "read_only" ? (
                          <Badge variant="ready">Read-only</Badge>
                        ) : null}
                      </div>
                      <div className="grid gap-2 text-xs text-slate-500">
                        {typeof capability.reliabilityScore === "number" ? (
                          <span>Reliability: {Math.round(capability.reliabilityScore * 100)}%</span>
                        ) : null}
                        {typeof capability.latencyP50Ms === "number" ? (
                          <span>Median response: {capability.latencyP50Ms}ms</span>
                        ) : null}
                        {capability.safetyNotes ? <span>{capability.safetyNotes}</span> : null}
                        {capability.docsUrl ? (
                          <Link href={capability.docsUrl} className="text-brand-primary underline underline-offset-4">
                            Capability docs
                          </Link>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-4">
              {app.agentDocsUrl ? (
                <Link href={app.agentDocsUrl} className="text-sm font-medium text-brand-primary underline underline-offset-4">
                  Agent docs
                </Link>
              ) : null}
              <Link
                href={`/api/agent-registry/${app.slug}`}
                className="text-sm font-medium text-brand-primary underline underline-offset-4"
              >
                View discovery manifest
              </Link>
            </div>
          </section>
        ) : null}
        <section className="space-y-5">
          <SectionHeading
            eyebrow="Updates"
            title="Latest changelog"
            description="Recent releases and improvements from the app team."
          />
          {updates.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No updates yet</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">New updates will appear here as this app ships improvements.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {updates.map((update) => (
                <Card key={update.id} id={`update-${update.id}`}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle>{update.title}</CardTitle>
                        <Badge variant="secondary">{update.versionLabel}</Badge>
                        {update.type ? <Badge variant="agent">{update.type}</Badge> : null}
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        {new Date(update.publishedAt).toLocaleString()}
                      </p>
                    </div>
                    <Link
                      href={`/apps/${app.slug}?update=${update.id}#update-${update.id}`}
                      className="text-sm text-brand-primary underline underline-offset-4"
                    >
                      Open
                    </Link>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-6 text-slate-700">{update.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
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
        <section className="space-y-5">
          <SectionHeading
            eyebrow="More like this"
            title="Similar apps"
            description="Embedding-driven recommendations with quality-aware reranking."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {similarApps.map((similarApp, index) => (
              <Link
                key={similarApp.id}
                href={`/apps/${similarApp.slug}?ref=similar&sourceAppId=${app.id}&position=${index + 1}`}
              >
                <Card className="h-full bg-white transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="flex h-full flex-col gap-3 p-5">
                    <div className="flex items-center gap-3">
                      <Image
                        src={similarApp.logoUrl}
                        alt={`${similarApp.name} logo`}
                        width={44}
                        height={44}
                        unoptimized
                        className="h-11 w-11 rounded-card object-cover"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-heading font-medium text-brand-text">{similarApp.name}</p>
                          {similarApp.verified ? <Badge variant="verified">Verified</Badge> : null}
                        </div>
                        <p className="text-sm text-slate-500">{similarApp.category.name}</p>
                      </div>
                    </div>
                    <p className="text-sm leading-6 text-slate-600">{similarApp.shortDescription}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {similarApps.length === 0 ? (
              <div className="rounded-card border border-dashed border-neutral-border bg-white p-6 text-sm text-neutral-muted">
                Similar apps will appear here once related listings have embeddings and activity history.
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}
