import { analyticsEvents, trackServerEvent } from "@cotana/analytics";
import { getSimilarApps } from "@cotana/search";
import type { AppSummary, AppTrustMetadata } from "@cotana/types";
import { normalizeTrustMetadata } from "@cotana/types";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAgentCapabilityQualitySignals,
  getEmptyStateMessage,
  getPublishedAppBySlug,
  getReviewEligibility,
  listAppUpdates,
  recordSearchClick,
  trackAppView,
  type AppDetailRecord
} from "@cotana/db";
import { AppCard, Badge, Card, CardContent, CardHeader, CardTitle, SectionHeading, TrustBadge } from "@cotana/ui";
import { AppTrustBadges } from "../../../components/app-trust-badges";
import { AppDetailActions } from "../../../components/app-detail-actions";
import { ReviewComposer } from "../../../components/review-composer";
import { ReviewFlagButton } from "../../../components/review-flag-button";
import { StoreHeader } from "../../../components/store-header";
import { demoApps, getDemoApp } from "../../../lib/demo-catalog";
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

async function withTimeout<T>(promise: Promise<T>, fallback: T, timeoutMs = 2500): Promise<T> {
  const timeoutPromise = new Promise<T>((resolve) => {
    setTimeout(() => resolve(fallback), timeoutMs);
  });

  return Promise.race([promise.catch(() => fallback), timeoutPromise]);
}

const trustLabels = {
  verified: "Verified",
  reviewed: "Reviewed",
  unreviewed: "Unreviewed",
  experimental: "Experimental"
};

const publisherLabels = {
  team: "Team",
  individual: "Individual",
  protocol: "Protocol",
  unknown: "Unknown"
};

function TrustProfile({ trustMetadata }: { trustMetadata: AppTrustMetadata }) {
  const reviewedAt = trustMetadata.lastReviewedAt
    ? new Date(trustMetadata.lastReviewedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    : "Not reviewed yet";
  const rows = [
    ["Publisher", trustMetadata.publisherName],
    ["Publisher type", publisherLabels[trustMetadata.publisherType]],
    ["Supported chains", trustMetadata.supportedChains.join(", ")],
    ["Permission scopes", trustMetadata.permissionScopes.join(", ")],
    ["Payment capabilities", trustMetadata.paymentCapabilities.join(", ")],
    ["Custody model", trustMetadata.custodyModel],
    ["Last reviewed", reviewedAt]
  ];

  return (
    <section className="space-y-3.5">
      <SectionHeading
        eyebrow="Trust profile"
        title="Trust metadata"
        description="A structured read on publisher identity, permissions, custody, payments, and Cotana review status."
      />
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{trustLabels[trustMetadata.verificationStatus]}</CardTitle>
            <p className="mt-1 text-[0.84rem] leading-[1.6] text-neutral-muted">{trustMetadata.reviewSummary}</p>
          </div>
          <Badge variant={trustMetadata.verificationStatus === "experimental" ? "agent" : trustMetadata.verificationStatus === "verified" ? "ready" : "secondary"}>
            {trustLabels[trustMetadata.verificationStatus]}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-3 text-[0.84rem] text-neutral-muted md:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-card border border-neutral-border/70 bg-neutral-surface/52 p-3">
              <p className="font-heading text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-neutral-subtle">{label}</p>
              <p className="mt-1 text-brand-text">{value}</p>
            </div>
          ))}
          <div className="rounded-card border border-neutral-border/70 bg-neutral-surface/52 p-3 md:col-span-2">
            <p className="font-heading text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-neutral-subtle">External risk notes</p>
            <p className="mt-1 leading-[1.6] text-brand-text">{trustMetadata.externalRiskNotes}</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function toDemoAppDetail(slug: string): AppDetailRecord | null {
  const app = getDemoApp(slug);

  if (!app) {
    return null;
  }

  return {
    ...app,
    websiteUrl: app.websiteUrl ?? "https://example.com",
    logoUrl: app.logoUrl,
    agentListingStatus: "NOT_APPLICABLE",
    agentSummary: null,
    agentDocsUrl: null,
    agentManifestVersion: 1,
    agentLastReviewedAt: null,
    createdAt: app.publishedAt ?? new Date("2026-01-01T00:00:00.000Z"),
    category: {
      id: `demo-category-${app.category.slug}`,
      slug: app.category.slug,
      name: app.category.name
    },
    trustMetadata: normalizeTrustMetadata(app.trustMetadata, {
      verified: app.verified,
      agentAudience: app.agentAudience
    }),
    tags: [app.category.name],
    screenshots: [],
    agentCapabilities: [],
    likedByCurrentUser: false,
    savedByCurrentUser: false,
    reviews: []
  };
}

export default async function AppDetailPage({ params, searchParams }: AppDetailPageProps) {
  const { slug } = await params;
  const { searchEventId, position, ref, shelfSlug, sourceAppId, category, update } = await searchParams;
  const sessionUser = await getSessionUser();
  let app = await withTimeout(getPublishedAppBySlug(slug, sessionUser?.id), null);
  let demoDetail = false;

  if (!app) {
    app = toDemoAppDetail(slug);
    demoDetail = Boolean(app);

    if (!app) {
      notFound();
    }
  }

  if (sessionUser?.id && !demoDetail) {
    await trackAppView(app.id, sessionUser.id);
  }

  if (searchEventId && position && !demoDetail) {
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

  const eligibility = sessionUser?.id && !demoDetail ? await getReviewEligibility(sessionUser.id, app.id) : null;
  const normalizedEligibility = eligibility
    ? {
        ...eligibility,
        nextEligibleAt: eligibility.nextEligibleAt?.toISOString() ?? null
      }
    : null;
  const [similarApps, updates] = demoDetail
    ? [demoApps.filter((candidate) => candidate.id !== app.id).slice(0, 4), []]
    : await withTimeout(
        Promise.all([
          getSimilarApps(app.id, {
            limit: 4,
            boostSameCategory: true
          }),
          listAppUpdates(app.id)
        ]),
        [[], []] as [AppSummary[], Awaited<ReturnType<typeof listAppUpdates>>]
      );
  const trustMetadata = normalizeTrustMetadata(app.trustMetadata, {
    verified: app.verified,
    agentAudience: app.agentAudience
  });

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
    <main className="min-h-screen bg-brand-surface">
      <StoreHeader />
      <section className="mx-auto max-w-6xl space-y-6 px-4 py-7 sm:px-6 sm:py-8">
        <div className="grid gap-5 rounded-card border border-neutral-border bg-neutral-panel p-4 shadow-panel sm:p-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-card bg-neutral-surface text-xl">
                {app.logoUrl ? (
                  <Image
                    src={app.logoUrl}
                    alt={`${app.name} logo`}
                    width={40}
                    height={40}
                    unoptimized
                    className="h-10 w-10 rounded-card object-cover"
                  />
                ) : (
                  <span className="font-heading text-[0.95rem] font-semibold text-brand-primary">{app.name.slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h1 className="font-heading text-[1.45rem] font-semibold tracking-tight text-brand-text sm:text-[1.55rem]">{app.name}</h1>
                  <AppTrustBadges verified={app.verified} communityPick={app.communityPick} />
                </div>
                <p className="text-[0.84rem] leading-[1.6] text-neutral-muted">{app.shortDescription}</p>
              </div>
            </div>
            <p className="max-w-3xl text-[0.84rem] leading-[1.68] text-neutral-muted">{app.longDescription}</p>
            {app.agentListingStatus === "PUBLISHED" ? (
              <div className="ui-panel-agent p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <TrustBadge tone="agent">Machine-readable</TrustBadge>
                  <span className="font-heading text-[0.82rem] font-medium text-trust-agent-ink">
                    {app.agentAudience === "HYBRID" ? "Built for people and AI agents" : "Built for AI agents"}
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <Badge variant="secondary">Discovery only</Badge>
                  {app.agentCapabilities.some((capability) => capability.interactionMode === "READ_ONLY") ? (
                    <TrustBadge tone="ready">Read-only capability</TrustBadge>
                  ) : null}
                  {app.agentCapabilities.some((capability) => getAgentCapabilityQualitySignals(capability).schemaComplete) ? (
                    <TrustBadge tone="ready">Schema available</TrustBadge>
                  ) : null}
                  {app.agentCapabilities.some((capability) => getAgentCapabilityQualitySignals(capability).safetyNotesPresent) ? (
                    <TrustBadge tone="ready">Safety notes available</TrustBadge>
                  ) : null}
                  {app.agentCapabilities.some((capability) => getAgentCapabilityQualitySignals(capability).docsAvailable) ? (
                    <TrustBadge tone="ready">Docs available</TrustBadge>
                  ) : null}
                </div>
                {app.agentSummary ? <p className="mt-2.5 text-[0.84rem] leading-[1.6] text-trust-agent-ink/76">{app.agentSummary}</p> : null}
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
              <div className="flex flex-wrap gap-1.5">
                {app.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
            {app.screenshots.length > 0 ? (
              <div className="grid gap-3.5 md:grid-cols-2">
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
            ) : (
              <div className="ui-empty-state p-4 text-[0.84rem]">
                {getEmptyStateMessage("screenshots")}
              </div>
            )}
          </div>
          <div className="space-y-3 rounded-card bg-brand-primary p-4 text-neutral-inverse">
            <SectionHeading
              eyebrow="App snapshot"
              title="Trust at a glance"
              description="A quick read on category fit, community rating, and where to open the app."
              inverse
            />
            <div className="grid gap-2 font-body text-[0.78rem] text-neutral-inverse/82">
              <div className="rounded-card bg-neutral-inverse/10 p-3">Category: {app.category.name}</div>
              <div className="rounded-card bg-neutral-inverse/10 p-3">
                Rating: {app.rating.toFixed(1)}/5 from {app.reviewCount} reviews
              </div>
              <div className="rounded-card bg-neutral-inverse/10 p-3">Likes: {app.likeCount}</div>
              <div className="rounded-card bg-neutral-inverse/10 p-3">
                <Link href={app.websiteUrl} className="text-neutral-inverse underline underline-offset-4">
                  Visit website
                </Link>
              </div>
            </div>
          </div>
        </div>
        <TrustProfile trustMetadata={trustMetadata} />
        {app.agentListingStatus === "PUBLISHED" ? (
          <section className="space-y-3.5">
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
                  <p className="text-[0.84rem] text-neutral-muted">
                    Agent access has been marked for this app, but active capabilities are still being configured.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3.5 md:grid-cols-2">
                {app.agentCapabilities.map((capability) => (
                  <Card key={capability.id}>
                    <CardHeader>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle>{capability.name}</CardTitle>
                        <Badge variant="secondary">{capability.capabilityType}</Badge>
                        <TrustBadge tone="agent">{capability.authType}</TrustBadge>
                        <Badge variant="secondary">{capability.interfaceType}</Badge>
                        <Badge variant="secondary">{capability.interactionMode}</Badge>
                        <TrustBadge tone={getAgentCapabilityQualitySignals(capability).qualityScore >= 80 ? "ready" : "warning"}>
                          {getAgentCapabilityQualitySignals(capability).qualityScore}/100 quality
                        </TrustBadge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2.5">
                      <p className="text-[0.84rem] leading-[1.6] text-brand-text/80">{capability.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {getAgentCapabilityQualitySignals(capability).schemaComplete ? (
                          <TrustBadge tone="ready">Schema available</TrustBadge>
                        ) : null}
                        {getAgentCapabilityQualitySignals(capability).safetyNotesPresent ? (
                          <TrustBadge tone="ready">Safety notes</TrustBadge>
                        ) : null}
                        {getAgentCapabilityQualitySignals(capability).docsAvailable ? (
                          <TrustBadge tone="ready">Docs</TrustBadge>
                        ) : null}
                        {getAgentCapabilityQualitySignals(capability).interactionSafety === "read_only" ? (
                          <TrustBadge tone="ready">Read-only</TrustBadge>
                        ) : null}
                      </div>
                      <div className="grid gap-1.5 text-xs text-neutral-muted">
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
            <div className="flex flex-wrap gap-3">
              {app.agentDocsUrl ? (
                <Link href={app.agentDocsUrl} className="text-[0.84rem] font-medium text-brand-primary underline underline-offset-4">
                  Agent docs
                </Link>
              ) : null}
              <Link
                href={`/api/agent-registry/${app.slug}`}
                className="text-[0.84rem] font-medium text-brand-primary underline underline-offset-4"
              >
                View discovery manifest
              </Link>
            </div>
          </section>
        ) : null}
        <section className="space-y-3.5">
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
                <p className="text-[0.84rem] text-neutral-muted">{getEmptyStateMessage("changelog")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3.5">
              {updates.map((update) => (
                <Card key={update.id} id={`update-${update.id}`}>
                    <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle>{update.title}</CardTitle>
                        <Badge variant="secondary">{update.versionLabel}</Badge>
                        {update.type ? <Badge variant="outline">{update.type}</Badge> : null}
                      </div>
                      <p className="mt-2 text-[0.84rem] text-neutral-muted">
                        {new Date(update.publishedAt).toLocaleString()}
                      </p>
                    </div>
                    <Link
                      href={`/apps/${app.slug}?update=${update.id}#update-${update.id}`}
                      className="text-[0.84rem] text-brand-primary underline underline-offset-4"
                    >
                      Open
                    </Link>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[0.84rem] leading-[1.6] text-brand-text/80">{update.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
        <ReviewComposer appId={app.id} canReview={Boolean(sessionUser)} eligibility={normalizedEligibility} />
        <section className="space-y-3.5">
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
                <p className="text-[0.84rem] text-neutral-muted">
                  {getEmptyStateMessage("reviews")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3.5">
              {app.reviews.map((review) => (
                <Card key={review.id}>
                    <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div>
                      <CardTitle>{review.user.displayName ?? "Cotana user"}</CardTitle>
                      <p className="mt-1 text-[0.84rem] text-neutral-muted">
                        {review.rating}/5 · {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ReviewFlagButton reviewId={review.id} canFlag={Boolean(sessionUser)} />
                  </CardHeader>
                  <CardContent>
                    <p className="text-[0.84rem] leading-[1.6] text-brand-text/80">{review.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
        <section className="space-y-3.5">
          <SectionHeading
            eyebrow="More like this"
            title="Similar apps"
            description="Embedding-driven recommendations with quality-aware reranking."
          />
          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-4">
            {similarApps.map((similarApp, index) => (
              <AppCard
                key={similarApp.id}
                app={similarApp}
                href={`/apps/${similarApp.slug}?ref=similar&sourceAppId=${app.id}&position=${index + 1}`}
              />
            ))}
            {similarApps.length === 0 ? (
              <div className="ui-empty-state p-4 text-[0.84rem]">
                {getEmptyStateMessage("similar")}
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}
