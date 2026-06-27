import { NextRequest } from "next/server";
import React from "react";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { AppCard } from "@cotana/ui";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const app = {
  id: "app-1",
  slug: "harbor-yield",
  name: "Harbor Yield",
  logoUrl: "https://example.com/logo.png",
  verified: true,
  communityPick: false,
  agentAudience: "HYBRID",
  agentSummary: "Agents can inspect read-only yield metadata.",
  trustMetadata: {
    verificationStatus: "verified",
    publisherName: "Harbor Labs",
    publisherType: "team",
    supportedChains: ["Ethereum", "Base"],
    permissionScopes: ["Public metadata", "Read-only API"],
    paymentCapabilities: ["None listed"],
    custodyModel: "Non-custodial discovery",
    externalRiskNotes: "External protocol risk remains outside Cotana review.",
    lastReviewedAt: new Date("2026-05-18T00:00:00.000Z"),
    reviewSummary: "Cotana reviewed publisher identity, product surface, and permission scope."
  },
  shortDescription: "Stablecoin yield strategies.",
  longDescription: "Compare yield strategies.",
  websiteUrl: "https://example.com",
  publishedAt: new Date("2026-05-17T00:00:00.000Z"),
  category: { slug: "lending-yield", name: "Lending & Yield", sortOrder: 1 },
  rating: 4.8,
  reviewCount: 2,
  likeCount: 10,
  reviews: []
};

const appTwo = {
  ...app,
  id: "app-2",
  slug: "fjord-defi",
  name: "Fjord DeFi",
  shortDescription: "Discover liquid DeFi opportunities fast.",
  category: { slug: "defi", name: "DeFi", sortOrder: 2 },
  communityPick: true
};

function collectText(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (!React.isValidElement(node)) {
    if (Array.isArray(node)) {
      return node.map(collectText).join(" ");
    }

    return "";
  }

  const rendered = renderPureComponent(node);

  if (rendered && rendered !== node) {
    return collectText(rendered);
  }

  return collectText((node.props as { children?: unknown }).children);
}

function countElementsByName(node: unknown, displayName: string): number {
  if (!React.isValidElement(node)) {
    return Array.isArray(node) ? node.reduce((total, child) => total + countElementsByName(child, displayName), 0) : 0;
  }

  const type = node.type as { name?: string; displayName?: string } | string;
  const name = typeof type === "string" ? type : type.displayName ?? type.name;
  const rendered = renderPureComponent(node);

  if (rendered && rendered !== node) {
    return (name === displayName ? 1 : 0) + countElementsByName(rendered, displayName);
  }

  const children = (node.props as { children?: unknown }).children;

  return (name === displayName ? 1 : 0) + countElementsByName(children, displayName);
}

function renderPureComponent(node: React.ReactElement) {
  const type = node.type;

  if (typeof type !== "function") {
    return null;
  }

  const name = type.displayName ?? type.name;
  const clientComponents = new Set(["StoreHeader", "StoreAuthControls", "ReviewComposer", "ReviewFlagButton", "AppDetailActions"]);

  if (clientComponents.has(name)) {
    return null;
  }

  return type(node.props);
}

const mocks = vi.hoisted(() => ({
  trackServerEvent: vi.fn(),
  listPublishedApps: vi.fn(),
  listCategories: vi.fn(),
  listPublicEditorialShelves: vi.fn(),
  listDiscoveryResults: vi.fn(),
  getPublishedAppBySlug: vi.fn(),
  getReviewEligibility: vi.fn(),
  listAppUpdates: vi.fn(),
  recordSearchClick: vi.fn(),
  trackAppView: vi.fn(),
  getSimilarApps: vi.fn(),
  getSessionUser: vi.fn(),
  getLaunchHealth: vi.fn(),
  checkRateLimit: vi.fn(),
  searchAgentRegistryCapabilitiesWithEvaluation: vi.fn(),
  recordAgentRegistryEvaluationLog: vi.fn(async () => undefined)
}));

vi.mock("@cotana/analytics", () => ({
  analyticsEvents: {
    shelfImpression: "shelf_impression",
    searchResultClicked: "search_result_clicked",
    appDetailViewed: "app_detail_viewed",
    similarAppClicked: "similar_app_clicked",
    changelogViewed: "changelog_viewed",
    changelogItemClicked: "changelog_item_clicked",
    verifiedBadgeSeen: "verified_badge_seen",
    communityPickBadgeSeen: "community_pick_badge_seen",
    agentRegistrySearched: "agent_registry_searched"
  },
  trackServerEvent: mocks.trackServerEvent
}));

vi.mock("@cotana/db", () => ({
  listPublishedApps: mocks.listPublishedApps,
  listCategories: mocks.listCategories,
  listPublicEditorialShelves: mocks.listPublicEditorialShelves,
  listDiscoveryResults: mocks.listDiscoveryResults,
  getPublishedAppBySlug: mocks.getPublishedAppBySlug,
  getReviewEligibility: mocks.getReviewEligibility,
  listAppUpdates: mocks.listAppUpdates,
  recordSearchClick: mocks.recordSearchClick,
  trackAppView: mocks.trackAppView,
  getLaunchHealth: mocks.getLaunchHealth,
  recordAgentRegistryEvaluationLog: mocks.recordAgentRegistryEvaluationLog,
  getAgentRegistryPublicReadinessMetadata: vi.fn(async () => ({
    registryVersion: "2026-05-17",
    schemaVersion: "2026-05-17",
    publishedAppCount: 0,
    activeCapabilityCount: 0,
    supportedCapabilityTypes: [],
    supportedAuthTypes: [],
    supportedInterfaceTypes: [],
    supportedInteractionModes: [],
    docsUrl: "/agent-registry/docs",
    policyUrl: "/api/agent-registry/policy"
  })),
  getAgentCapabilityQualitySignals: vi.fn(() => ({
    schemaComplete: true,
    safetyNotesPresent: true,
    docsAvailable: true,
    endpointAvailable: true,
    qualityScore: 90,
    qualityGrade: "excellent"
  })),
  getEmptyStateMessage: (kind: string) => `empty:${kind}`
}));

vi.mock("@cotana/search", () => ({
  getSimilarApps: mocks.getSimilarApps,
  searchAgentRegistryCapabilitiesWithEvaluation: mocks.searchAgentRegistryCapabilitiesWithEvaluation
}));

vi.mock("@cotana/db/redis", () => ({
  checkRateLimit: mocks.checkRateLimit
}));

vi.mock("../lib/session", () => ({
  getSessionUser: mocks.getSessionUser
}));

vi.mock("../lib/request", () => ({
  getRequestIdentity: () => "smoke-agent"
}));

vi.mock("../lib/origin", () => ({
  getStoreOrigin: () => "https://cotana.test"
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not found");
  }
}));

import { GET as registryDiscoveryGET } from "../app/.well-known/cotana-agent-registry/route";
import { GET as registrySchemaGET } from "../app/api/agent-registry/schema/route";
import { GET as registrySearchGET } from "../app/api/agent-registry/search/route";
import { GET as storeHealthGET } from "../app/api/health/route";
import AppDetailPage from "../app/apps/[slug]/page";
import CategoryPage from "../app/category/[slug]/page";
import { GET as llmsGET } from "../app/llms.txt/route";
import StoreHomePage from "../app/page";
import SearchPage from "../app/search/page";

describe("staging launch smoke routes", () => {
  it("loads public store pages", async () => {
    mocks.listPublishedApps.mockResolvedValue([app, appTwo]);
    mocks.listCategories.mockResolvedValue([{ slug: "all", name: "All", sortOrder: 0 }, app.category, appTwo.category]);
    mocks.listPublicEditorialShelves.mockResolvedValue([
      {
        id: "shelf-1",
        title: "Featured",
        slug: "featured",
        description: "A tight selection of trustworthy apps.",
        pinned: true,
        category: null,
        items: [app, appTwo]
      }
    ]);
    mocks.listDiscoveryResults.mockResolvedValue({ rows: [{ app }, { app: appTwo }] });
    mocks.getSessionUser.mockResolvedValue(null);
    mocks.getPublishedAppBySlug.mockResolvedValue({
      ...app,
      likedByCurrentUser: false,
      savedByCurrentUser: false,
      tags: [],
      screenshots: [{ id: "shot-1", imageUrl: "https://example.com/screenshot.png", sortOrder: 0 }],
      reviews: [
        {
          id: "review-1",
          rating: 5,
          body: "Clean, useful, and easy to compare.",
          createdAt: new Date("2026-05-17T00:00:00.000Z"),
          user: { displayName: "Mara", avatarUrl: null }
        }
      ],
      agentAudience: "HYBRID",
      agentListingStatus: "PUBLISHED",
      agentSummary: "Agents can inspect read-only yield metadata.",
      agentDocsUrl: "https://example.com/docs",
      trustMetadata: app.trustMetadata,
      agentCapabilities: []
    });
    mocks.getReviewEligibility.mockResolvedValue(null);
    mocks.listAppUpdates.mockResolvedValue([
      {
        id: "update-1",
        versionLabel: "v1.0",
        title: "Launch polish",
        body: "Improved the public app experience.",
        type: "FEATURE",
        publishedAt: new Date("2026-05-17T00:00:00.000Z")
      }
    ]);
    mocks.getSimilarApps.mockResolvedValue([appTwo]);

    const home = await StoreHomePage();
    const category = await CategoryPage({ params: Promise.resolve({ slug: "lending-yield" }) });
    const detail = await AppDetailPage({ params: Promise.resolve({ slug: "harbor-yield" }), searchParams: Promise.resolve({}) });

    expect(countElementsByName(home, "AppCard")).toBeGreaterThanOrEqual(6);
    expect(collectText(home)).toContain("Discover the best crypto apps.");
    expect(collectText(home)).toContain("Apps people are checking out");
    expect(collectText(home)).toContain("Apps gaining momentum");
    expect(countElementsByName(category, "AppCard")).toBeGreaterThanOrEqual(3);
    expect(collectText(detail)).toContain("Latest changelog");
    expect(collectText(detail)).toContain("Trust metadata");
    expect(collectText(detail)).toContain("Harbor Labs");
    expect(collectText(detail)).toContain("External protocol risk remains outside Cotana review.");
    expect(collectText(detail)).toContain("Recent reviews");
    expect(collectText(detail)).toContain("Similar apps");
    await expect(SearchPage({ searchParams: Promise.resolve({}) })).resolves.toBeTruthy();
  });

  it("keeps public cards and auth controls consumer-facing", async () => {
    const card = AppCard({ app });
    const missingMetadataCard = AppCard({ app: { ...app, trustMetadata: undefined } });
    const visibleText = collectText(card);
    const missingMetadataText = collectText(missingMetadataCard);
    const authControlsSource = readFileSync("apps/store/components/store-auth-controls.tsx", "utf8");

    expect(visibleText).toContain("Verified");
    expect(visibleText).not.toContain("Harbor Labs");
    expect(visibleText).not.toContain("External protocol risk remains outside Cotana review.");
    expect(missingMetadataText).toContain("Verified");
    expect(visibleText).not.toContain("READ_ONLY");
    expect(visibleText).not.toContain("HTTP_API");
    expect(visibleText).not.toContain("agentAudience");
    expect(visibleText).not.toContain("Agents can inspect read-only yield metadata.");
    expect(authControlsSource).toContain("<Button");
    expect(authControlsSource).toContain("Sign in");
  });

  it("loads registry and health routes with expected shapes", async () => {
    mocks.getLaunchHealth.mockResolvedValue({
      app: "cotana-store",
      environment: "test",
      build: { version: "0.1.0", commitHash: null },
      databaseReachable: true,
      redisReachable: true,
      authConfigPresent: false,
      analyticsConfigPresent: false,
      registryVersion: "2026-05-17",
      timestamp: "2026-05-17T00:00:00.000Z",
      status: "ok"
    });
    mocks.checkRateLimit.mockResolvedValue({ allowed: true });
    mocks.searchAgentRegistryCapabilitiesWithEvaluation.mockResolvedValue({
      results: [],
      evaluation: {
        query: "yield",
        normalizedQuery: "yield",
        filters: {},
        candidateCount: 0,
        matchedCapabilityCount: 0,
        resultCount: 0,
        topMatch: null,
        excludedCandidates: [],
        blockingIssueCount: 0
      }
    });

    const discovery = await registryDiscoveryGET(new Request("https://cotana.test/.well-known/cotana-agent-registry"));
    const schema = await registrySchemaGET(new Request("https://cotana.test/api/agent-registry/schema"));
    const search = await registrySearchGET(new NextRequest("https://cotana.test/api/agent-registry/search?q=yield"));
    const health = await storeHealthGET();
    const llms = await llmsGET();

    expect((await discovery.json()).purpose).toBe("discovery");
    expect((await schema.json()).schemas).toBeTruthy();
    expect((await search.json()).results).toEqual([]);
    expect((await health.json()).app).toBe("cotana-store");
    expect(await llms.text()).toContain("/api/agent-registry/policy");
  });
});
