import type { AppSummary } from "@cotana/types";

export type DemoAppSummary = AppSummary & {
  websiteUrl: string;
};

export const demoApps: DemoAppSummary[] = [
  {
    id: "demo-uniswap",
    slug: "uniswap",
    name: "Uniswap",
    logoUrl: "",
    verified: true,
    communityPick: true,
    agentAudience: "HUMAN",
    shortDescription: "Swap tokens with trusted liquidity",
    longDescription: "Demo listing for app discovery.",
    websiteUrl: "https://uniswap.org",
    publishedAt: new Date("2026-01-01T00:00:00.000Z"),
    category: { slug: "defi", name: "DeFi", sortOrder: 1 },
    rating: 4.8,
    reviewCount: 124,
    likeCount: 980
  },
  {
    id: "demo-aave",
    slug: "aave",
    name: "Aave",
    logoUrl: "",
    verified: true,
    communityPick: false,
    agentAudience: "HUMAN",
    shortDescription: "Borrow and lend crypto assets",
    longDescription: "Demo listing for app discovery.",
    websiteUrl: "https://aave.com",
    publishedAt: new Date("2026-01-02T00:00:00.000Z"),
    category: { slug: "lending-yield", name: "Lending & Yield", sortOrder: 2 },
    rating: 4.7,
    reviewCount: 98,
    likeCount: 760
  },
  {
    id: "demo-hyperliquid",
    slug: "hyperliquid",
    name: "Hyperliquid",
    logoUrl: "",
    verified: true,
    communityPick: true,
    agentAudience: "HUMAN",
    shortDescription: "Trade perps with deep liquidity",
    longDescription: "Demo listing for app discovery.",
    websiteUrl: "https://hyperliquid.xyz",
    publishedAt: new Date("2026-01-03T00:00:00.000Z"),
    category: { slug: "trading", name: "Trading", sortOrder: 3 },
    rating: 4.8,
    reviewCount: 87,
    likeCount: 820
  },
  {
    id: "demo-pendle",
    slug: "pendle",
    name: "Pendle",
    logoUrl: "",
    verified: true,
    communityPick: false,
    agentAudience: "HUMAN",
    shortDescription: "Explore fixed yield strategies",
    longDescription: "Demo listing for app discovery.",
    websiteUrl: "https://pendle.finance",
    publishedAt: new Date("2026-01-04T00:00:00.000Z"),
    category: { slug: "lending-yield", name: "Lending & Yield", sortOrder: 2 },
    rating: 4.6,
    reviewCount: 61,
    likeCount: 520
  },
  {
    id: "demo-polymarket",
    slug: "polymarket",
    name: "Polymarket",
    logoUrl: "",
    verified: true,
    communityPick: true,
    agentAudience: "HUMAN",
    shortDescription: "Follow real-world prediction markets",
    longDescription: "Demo listing for app discovery.",
    websiteUrl: "https://polymarket.com",
    publishedAt: new Date("2026-01-05T00:00:00.000Z"),
    category: { slug: "prediction-markets", name: "Prediction Markets", sortOrder: 4 },
    rating: 4.7,
    reviewCount: 73,
    likeCount: 690
  },
  {
    id: "demo-jupiter",
    slug: "jupiter",
    name: "Jupiter",
    logoUrl: "",
    verified: true,
    communityPick: false,
    agentAudience: "HUMAN",
    shortDescription: "Find efficient swap routes",
    longDescription: "Demo listing for app discovery.",
    websiteUrl: "https://jup.ag",
    publishedAt: new Date("2026-01-06T00:00:00.000Z"),
    category: { slug: "trading", name: "Trading", sortOrder: 3 },
    rating: 4.7,
    reviewCount: 80,
    likeCount: 610
  },
  {
    id: "demo-morpho",
    slug: "morpho",
    name: "Morpho",
    logoUrl: "",
    verified: true,
    communityPick: false,
    agentAudience: "HUMAN",
    shortDescription: "Discover curated lending markets",
    longDescription: "Demo listing for app discovery.",
    websiteUrl: "https://morpho.org",
    publishedAt: new Date("2026-01-07T00:00:00.000Z"),
    category: { slug: "lending-yield", name: "Lending & Yield", sortOrder: 2 },
    rating: 4.5,
    reviewCount: 47,
    likeCount: 430
  },
  {
    id: "demo-safe",
    slug: "safe",
    name: "Safe",
    logoUrl: "",
    verified: true,
    communityPick: false,
    agentAudience: "HUMAN",
    shortDescription: "Manage shared account security",
    longDescription: "Demo listing for app discovery.",
    websiteUrl: "https://safe.global",
    publishedAt: new Date("2026-01-08T00:00:00.000Z"),
    category: { slug: "wallets", name: "Wallets", sortOrder: 10 },
    rating: 4.6,
    reviewCount: 65,
    likeCount: 540
  },
  {
    id: "demo-farcaster",
    slug: "farcaster",
    name: "Farcaster",
    logoUrl: "",
    verified: true,
    communityPick: false,
    agentAudience: "HUMAN",
    shortDescription: "Join crypto-native social spaces",
    longDescription: "Demo listing for app discovery.",
    websiteUrl: "https://farcaster.xyz",
    publishedAt: new Date("2026-01-09T00:00:00.000Z"),
    category: { slug: "social", name: "Social", sortOrder: 6 },
    rating: 4.4,
    reviewCount: 52,
    likeCount: 390
  },
  {
    id: "demo-cowswap",
    slug: "cowswap",
    name: "CowSwap",
    logoUrl: "",
    verified: true,
    communityPick: false,
    agentAudience: "HUMAN",
    shortDescription: "Swap with protected execution",
    longDescription: "Demo listing for app discovery.",
    websiteUrl: "https://swap.cow.fi",
    publishedAt: new Date("2026-01-10T00:00:00.000Z"),
    category: { slug: "trading", name: "Trading", sortOrder: 3 },
    rating: 4.5,
    reviewCount: 44,
    likeCount: 360
  }
];

export function uniqueDemoCategories() {
  const seen = new Map<string, { id: string; slug: string; name: string; sortOrder: number }>();
  seen.set("all", { id: "demo-category-all", slug: "all", name: "All", sortOrder: 0 });

  for (const app of demoApps) {
    if (!seen.has(app.category.slug)) {
      seen.set(app.category.slug, {
        id: `demo-category-${app.category.slug}`,
        slug: app.category.slug,
        name: app.category.name,
        sortOrder: app.category.sortOrder
      });
    }
  }

  return [...seen.values()].sort((first, second) => first.sortOrder - second.sortOrder);
}

export function getDemoApp(slug: string) {
  return demoApps.find((app) => app.slug === slug) ?? null;
}
