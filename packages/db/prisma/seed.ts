import { AppStatus, PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
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
] as const;

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, sortOrder: category.sortOrder },
      create: category
    });
  }

  const adminEmail = process.env.ADMIN_ALLOWLIST_EMAIL?.split(",")[0]?.trim().toLowerCase();

  if (!adminEmail) {
    throw new Error("ADMIN_ALLOWLIST_EMAIL must be set to seed the initial admin user.");
  }

  const adminUser = await prisma.user.upsert({
    where: { privyDid: `seed:admin:${adminEmail}` },
    update: {
      email: adminEmail,
      displayName: "Cotana Admin",
      avatarUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=CotanaAdmin",
      role: UserRole.ADMIN
    },
    create: {
      privyDid: `seed:admin:${adminEmail}`,
      email: adminEmail,
      username: "cotana-admin",
      displayName: "Cotana Admin",
      avatarUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=CotanaAdmin",
      role: UserRole.ADMIN,
      profile: {
        create: {
          bio: "Seeded admin account for local development.",
          profileCompleted: true
        }
      }
    }
  });

  const categoryLookup = new Map(
    (await prisma.category.findMany()).map((category) => [category.slug, category.id]),
  );

  const exampleApps = [
    {
      slug: "harbor-yield",
      name: "Harbor Yield",
      shortDescription: "Stablecoin yield strategies for passive savers.",
      longDescription:
        "Harbor Yield helps users compare curated yield opportunities in a clean consumer interface without exposing technical wallet workflows.",
      websiteUrl: "https://example.com/harbor-yield",
      logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=HarborYield",
      verified: true,
      categorySlug: "lending-yield",
      tags: ["yield", "savings", "stablecoins"],
      signals: [
        { signalType: "category_metric", signalKey: "apy", numericValue: 8.4 },
        { signalType: "category_metric", signalKey: "tvl", numericValue: 142000000 },
        { signalType: "category_metric", signalKey: "protocol_age", numericValue: 34 },
        { signalType: "category_metric", signalKey: "supported_asset_count", numericValue: 12 }
      ]
    },
    {
      slug: "signal-bet",
      name: "Signal Bet",
      shortDescription: "Prediction markets for real-world events.",
      longDescription:
        "Signal Bet brings approachable market discovery and readable outcomes to users who want a simple interface for prediction-driven products.",
      websiteUrl: "https://example.com/signal-bet",
      logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=SignalBet",
      verified: true,
      categorySlug: "prediction-markets",
      tags: ["events", "markets", "forecasts"],
      signals: [
        { signalType: "category_metric", signalKey: "open_interest", numericValue: 8800000 },
        { signalType: "category_metric", signalKey: "active_markets", numericValue: 146 },
        { signalType: "category_metric", signalKey: "resolved_market_volume", numericValue: 41200000 }
      ]
    },
    {
      slug: "fjord-defi",
      name: "Fjord DeFi",
      shortDescription: "Discover liquid DeFi opportunities fast.",
      longDescription:
        "Fjord DeFi curates trustworthy protocols and high-liquidity routes through an app-store style product surface.",
      websiteUrl: "https://example.com/fjord-defi",
      logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=FjordDefi",
      verified: true,
      categorySlug: "defi",
      tags: ["defi", "liquidity", "swaps"],
      signals: [
        { signalType: "category_metric", signalKey: "tvl", numericValue: 265000000 },
        { signalType: "category_metric", signalKey: "volume", numericValue: 94000000 },
        { signalType: "category_metric", signalKey: "liquidity_depth", numericValue: 7200000 }
      ]
    }
  ];

  for (const app of exampleApps) {
    const categoryId = categoryLookup.get(app.categorySlug);

    if (!categoryId) {
      throw new Error(`Missing category ${app.categorySlug}`);
    }

    const createdApp = await prisma.app.upsert({
      where: { slug: app.slug },
      update: {
        name: app.name,
        shortDescription: app.shortDescription,
        longDescription: app.longDescription,
        websiteUrl: app.websiteUrl,
        logoUrl: app.logoUrl,
        verified: app.verified,
        categoryId,
        status: AppStatus.PUBLISHED,
        publishedAt: new Date()
      },
      create: {
        slug: app.slug,
        name: app.name,
        shortDescription: app.shortDescription,
        longDescription: app.longDescription,
        websiteUrl: app.websiteUrl,
        logoUrl: app.logoUrl,
        verified: app.verified,
        categoryId,
        status: AppStatus.PUBLISHED,
        createdByUserId: adminUser.id,
        publishedAt: new Date()
      }
    });

    await prisma.appTag.deleteMany({
      where: { appId: createdApp.id }
    });

    await prisma.appTag.createMany({
      data: app.tags.map((tag) => ({
        appId: createdApp.id,
        tag
      }))
    });

    await prisma.appSignal.deleteMany({
      where: { appId: createdApp.id }
    });

    await prisma.appSignal.createMany({
      data: app.signals.map((signal) => ({
        appId: createdApp.id,
        signalType: signal.signalType,
        signalKey: signal.signalKey,
        numericValue: signal.numericValue,
        source: "seed",
        observedAt: new Date()
      }))
    });
  }

  const rankingConfigs = [
    {
      key: "ranking.weights.default",
      valueJson: {
        similarityWeight: 0.55,
        ratingWeight: 0.1,
        reviewWeight: 0.1,
        likesWeight: 0.1,
        pageVelocityWeight: 0.1,
        signalWeights: {
          tvl: 0.025,
          apy: 0.025
        }
      }
    },
    {
      key: "ranking.weights.lending-yield",
      valueJson: {
        similarityWeight: 0.5,
        ratingWeight: 0.1,
        reviewWeight: 0.08,
        likesWeight: 0.07,
        pageVelocityWeight: 0.08,
        signalWeights: {
          apy: 0.05,
          tvl: 0.035,
          protocol_age: 0.02,
          supported_asset_count: 0.025
        }
      }
    },
    {
      key: "ranking.weights.prediction-markets",
      valueJson: {
        similarityWeight: 0.52,
        ratingWeight: 0.1,
        reviewWeight: 0.08,
        likesWeight: 0.08,
        pageVelocityWeight: 0.09,
        signalWeights: {
          open_interest: 0.05,
          active_markets: 0.03,
          resolved_market_volume: 0.03
        }
      }
    },
    {
      key: "ranking.weights.defi",
      valueJson: {
        similarityWeight: 0.52,
        ratingWeight: 0.1,
        reviewWeight: 0.08,
        likesWeight: 0.08,
        pageVelocityWeight: 0.09,
        signalWeights: {
          tvl: 0.05,
          volume: 0.04,
          liquidity_depth: 0.03
        }
      }
    }
  ];

  for (const config of rankingConfigs) {
    await prisma.configKV.upsert({
      where: { key: config.key },
      update: {
        valueJson: config.valueJson
      },
      create: config
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
