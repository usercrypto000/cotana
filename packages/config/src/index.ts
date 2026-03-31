import type { AppSummary, CategoryDefinition } from "@cotana/types";

export const storeCategories: CategoryDefinition[] = [
  { slug: "all", name: "All", sortOrder: 0 },
  { slug: "defi", name: "DeFi", sortOrder: 1 },
  { slug: "lending-yield", name: "Lending & Yield", sortOrder: 2 },
  { slug: "trading", name: "Trading", sortOrder: 3 },
  { slug: "prediction-markets", name: "Prediction Markets", sortOrder: 4 },
  { slug: "payments", name: "Payments", sortOrder: 5 },
  { slug: "social", name: "Social", sortOrder: 6 },
  { slug: "gaming", name: "Gaming", sortOrder: 7 },
  { slug: "nft-collectibles", name: "NFT & Collectibles", sortOrder: 8 },
  { slug: "identity", name: "Identity", sortOrder: 9 },
  { slug: "wallets", name: "Wallets", sortOrder: 10 },
  { slug: "staking", name: "Staking", sortOrder: 11 },
  { slug: "rwa", name: "RWA", sortOrder: 12 },
  { slug: "launchpads", name: "Launchpads", sortOrder: 13 }
];

export const adminNavigation = [
  { href: "/", label: "Overview" },
  { href: "/apps/new", label: "Create App" },
  { href: "/reviews", label: "Flag Queue" },
  { href: "/signals", label: "Signal Jobs" }
];

const categoryMap = new Map(storeCategories.map((category) => [category.slug, category]));

const getCategory = (slug: string) => {
  const category = categoryMap.get(slug);

  if (!category) {
    throw new Error(`Unknown category slug: ${slug}`);
  }

  return category;
};

export const demoApps: AppSummary[] = [
  {
    id: "app_1",
    slug: "harbor-yield",
    name: "Harbor Yield",
    logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=HarborYield",
    verified: true,
    shortDescription: "Stablecoin yield strategies for passive savers.",
    longDescription:
      "Harbor Yield helps users compare curated yield vaults, monitor risk posture, and move through a simple saving workflow without a technical interface.",
    category: getCategory("lending-yield"),
    rating: 4.8,
    reviewCount: 182,
    likeCount: 1240
  },
  {
    id: "app_2",
    slug: "signal-bet",
    name: "Signal Bet",
    logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=SignalBet",
    verified: true,
    shortDescription: "Prediction markets for real-world events.",
    longDescription:
      "Signal Bet packages market discovery and position tracking into an approachable interface focused on clarity and daily relevance.",
    category: getCategory("prediction-markets"),
    rating: 4.6,
    reviewCount: 94,
    likeCount: 844
  },
  {
    id: "app_3",
    slug: "fjord-defi",
    name: "Fjord DeFi",
    logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=FjordDefi",
    verified: true,
    shortDescription: "Discover liquid DeFi opportunities fast.",
    longDescription:
      "Fjord DeFi surfaces trusted routes for swaps, liquidity, and lending through a consumer-friendly discovery layer.",
    category: getCategory("defi"),
    rating: 4.7,
    reviewCount: 136,
    likeCount: 978
  },
  {
    id: "app_4",
    slug: "atlas-trade",
    name: "Atlas Trade",
    logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=AtlasTrade",
    verified: false,
    shortDescription: "Fast cross-market trading tools.",
    longDescription:
      "Atlas Trade wraps market scanning, execution shortcuts, and portfolio cues in a streamlined interface for active traders.",
    category: getCategory("trading"),
    rating: 4.3,
    reviewCount: 72,
    likeCount: 520
  },
  {
    id: "app_5",
    slug: "echo-social",
    name: "Echo Social",
    logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=EchoSocial",
    verified: true,
    shortDescription: "Social discovery for crypto communities.",
    longDescription:
      "Echo Social helps users discover conversations, creators, and communities through a feed that feels familiar.",
    category: getCategory("social"),
    rating: 4.4,
    reviewCount: 54,
    likeCount: 311
  },
  {
    id: "app_6",
    slug: "vault-stake",
    name: "Vault Stake",
    logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=VaultStake",
    verified: false,
    shortDescription: "Simple staking choices with guided setup.",
    longDescription:
      "Vault Stake makes validator selection and staking comparisons feel straightforward for mainstream users.",
    category: getCategory("staking"),
    rating: 4.5,
    reviewCount: 63,
    likeCount: 404
  }
];
