import {
  AppPublisherType,
  AppStatus,
  AppUpdateType,
  AppVerificationStatus,
  EditorialShelfStatus,
  EditorialShelfVisibility,
  PrismaClient,
  ReviewStatus,
  UserRole
} from "@prisma/client";
import { recomputeDiscoveryInsights } from "../src/services/discovery";
import { seededReviewBodies } from "../src/services/seed-fixtures";
import { assertSeedFixturesAllowed } from "../src/services/seed-guards";

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
  assertSeedFixturesAllowed();

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
      verifiedNote: "Established lending interface with strong product clarity and internal review completed.",
      categorySlug: "lending-yield",
      tags: ["yield", "savings", "stablecoins"],
      updates: [
        {
          versionLabel: "v1.8",
          title: "Yield comparison refresh",
          body: "Updated vault scoring, cleaner stablecoin risk labels, and faster comparison loading across the main save flow.",
          type: AppUpdateType.FEATURE
        },
        {
          versionLabel: "Mar 2026",
          title: "Improved onboarding guidance",
          body: "Simplified the first-run experience and clarified how passive savers should compare strategies before saving an app.",
          type: AppUpdateType.GENERAL
        }
      ],
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
      verifiedNote: "Strong market clarity and liquidity coverage verified by internal review.",
      categorySlug: "prediction-markets",
      tags: ["events", "markets", "forecasts"],
      updates: [
        {
          versionLabel: "v2.1",
          title: "Daily events feed",
          body: "Added a cleaner daily events feed and better resolved-market summaries for returning users.",
          type: AppUpdateType.FEATURE
        }
      ],
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
      verifiedNote: "Consistent liquidity coverage and polished consumer experience.",
      categorySlug: "defi",
      tags: ["defi", "liquidity", "swaps"],
      updates: [
        {
          versionLabel: "v1.4",
          title: "Cleaner route explorer",
          body: "Refined liquidity route previews and made it easier to compare trusted paths before visiting the app website.",
          type: AppUpdateType.FEATURE
        }
      ],
      signals: [
        { signalType: "category_metric", signalKey: "tvl", numericValue: 265000000 },
        { signalType: "category_metric", signalKey: "volume", numericValue: 94000000 },
        { signalType: "category_metric", signalKey: "liquidity_depth", numericValue: 7200000 }
      ]
    },
    {
      slug: "atlas-trade",
      name: "Atlas Trade",
      shortDescription: "Fast cross-market trading workflows.",
      longDescription:
        "Atlas Trade packages market scanning, execution shortcuts, and watchlist organization into a streamlined consumer trading surface.",
      websiteUrl: "https://example.com/atlas-trade",
      logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=AtlasTrade",
      verified: false,
      verifiedNote: null,
      categorySlug: "trading",
      tags: ["trading", "markets", "watchlists"],
      updates: [
        {
          versionLabel: "Launch",
          title: "Watchlists and quick routes",
          body: "Introduced a cleaner trading launch surface with saved watchlists and faster market switching.",
          type: AppUpdateType.GENERAL
        }
      ],
      signals: []
    },
    {
      slug: "echo-social",
      name: "Echo Social",
      shortDescription: "Social discovery for crypto communities.",
      longDescription:
        "Echo Social helps users discover conversations, creators, and communities through a feed that feels familiar and easy to browse.",
      websiteUrl: "https://example.com/echo-social",
      logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=EchoSocial",
      verified: true,
      verifiedNote: "Internal review confirmed a strong consumer UX and clear moderation posture.",
      categorySlug: "social",
      tags: ["social", "creators", "communities"],
      updates: [
        {
          versionLabel: "v1.2",
          title: "Creator collections",
          body: "Added cleaner community collections and easier ways to keep track of trusted creators.",
          type: AppUpdateType.FEATURE
        }
      ],
      signals: []
    },
    {
      slug: "vault-stake",
      name: "Vault Stake",
      shortDescription: "Simple staking choices with guided setup.",
      longDescription:
        "Vault Stake makes validator selection and staking comparisons feel straightforward for mainstream users who want simplicity first.",
      websiteUrl: "https://example.com/vault-stake",
      logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=VaultStake",
      verified: false,
      verifiedNote: null,
      categorySlug: "staking",
      tags: ["staking", "validators", "guides"],
      updates: [
        {
          versionLabel: "v1.0",
          title: "Validator comparison cards",
          body: "Improved validator comparison cards and simplified the main staking selection experience.",
          type: AppUpdateType.FEATURE
        }
      ],
      signals: [
        { signalType: "category_metric", signalKey: "apr", numericValue: 6.1 },
        { signalType: "category_metric", signalKey: "supported_assets", numericValue: 9 },
        { signalType: "category_metric", signalKey: "validator_count", numericValue: 42 }
      ]
    },
    {
      slug: "civic-pass",
      name: "Civic Pass",
      shortDescription: "Portable identity checks for safer access.",
      longDescription:
        "Civic Pass helps people move through identity-sensitive experiences with a clean, consumer-friendly interface.",
      websiteUrl: "https://example.com/civic-pass",
      logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=CivicPass",
      verified: true,
      verifiedNote: "Verified due to clear compliance posture and high trust utility.",
      categorySlug: "identity",
      tags: ["identity", "trust", "access"],
      updates: [
        {
          versionLabel: "Spring 2026",
          title: "Faster verification handoff",
          body: "Reduced friction in the identity handoff flow and improved status visibility after submission.",
          type: AppUpdateType.PERFORMANCE
        }
      ],
      signals: []
    },
    {
      slug: "pixel-port",
      name: "Pixel Port",
      shortDescription: "Game discovery with player-first curation.",
      longDescription:
        "Pixel Port organizes game worlds, daily activity, and discovery cues into a storefront-like experience that feels easy to browse.",
      websiteUrl: "https://example.com/pixel-port",
      logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=PixelPort",
      verified: false,
      verifiedNote: null,
      categorySlug: "gaming",
      tags: ["gaming", "quests", "worlds"],
      updates: [
        {
          versionLabel: "v0.9",
          title: "New launch queue",
          body: "Added a cleaner launch queue and better discovery cues for returning players.",
          type: AppUpdateType.FEATURE
        }
      ],
      signals: []
    },
    {
      slug: "rwa-hub",
      name: "RWA Hub",
      shortDescription: "Track real-world asset platforms simply.",
      longDescription:
        "RWA Hub gives people a simple way to compare asset-backed products without drowning them in metrics-heavy dashboards.",
      websiteUrl: "https://example.com/rwa-hub",
      logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=RWAHub",
      verified: true,
      verifiedNote: "Verified for strong product clarity and curated scope.",
      categorySlug: "rwa",
      tags: ["rwa", "assets", "comparison"],
      updates: [
        {
          versionLabel: "v1.1",
          title: "Asset comparison refresh",
          body: "Improved comparison cards and made it easier to distinguish conservative products from riskier options.",
          type: AppUpdateType.GENERAL
        }
      ],
      signals: []
    }
  ];

  if (process.env.COTANA_SEED_LAUNCH_CATALOG === "true") {
    (exampleApps as unknown as Array<Record<string, unknown>>).push(
      {
        slug: "pay-signal",
        name: "Pay Signal",
        shortDescription: "Payment metadata and checkout discovery.",
        longDescription:
          "Pay Signal helps teams inspect supported payment rails, currencies, and checkout metadata before choosing a payment app.",
        websiteUrl: "https://example.com/pay-signal",
        logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=PaySignal",
        verified: true,
        verifiedNote: "Launch catalog fixture with strong read-only payment metadata.",
        categorySlug: "payments",
        tags: ["payments", "checkout", "metadata"],
        updates: [],
        signals: [{ signalType: "category_metric", signalKey: "supported_rails", numericValue: 8 }]
      },
      {
        slug: "wallet-atlas",
        name: "Wallet Atlas",
        shortDescription: "Wallet compatibility and portfolio read surfaces.",
        longDescription:
          "Wallet Atlas compares wallet support, chain coverage, and read-only portfolio surfaces for users choosing a wallet.",
        websiteUrl: "https://example.com/wallet-atlas",
        logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=WalletAtlas",
        verified: true,
        verifiedNote: "Launch catalog fixture with complete portfolio-read metadata.",
        categorySlug: "wallets",
        tags: ["wallets", "portfolio", "compatibility"],
        updates: [],
        signals: [{ signalType: "category_metric", signalKey: "supported_chains", numericValue: 24 }]
      },
      {
        slug: "stake-radar",
        name: "Stake Radar",
        shortDescription: "Discover staking opportunities across validators.",
        longDescription:
          "Stake Radar presents staking opportunity metadata, validator coverage, and risk labels without initiating stake actions.",
        websiteUrl: "https://example.com/stake-radar",
        logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=StakeRadar",
        verified: true,
        verifiedNote: "Launch catalog fixture for staking opportunity discovery.",
        categorySlug: "staking",
        tags: ["staking", "validators", "apr"],
        updates: [],
        signals: [{ signalType: "category_metric", signalKey: "validator_count", numericValue: 118 }]
      },
      {
        slug: "launch-lens",
        name: "Launch Lens",
        shortDescription: "Launchpad project discovery and eligibility metadata.",
        longDescription:
          "Launch Lens helps users compare launchpad projects and eligibility surfaces before visiting the source app.",
        websiteUrl: "https://example.com/launch-lens",
        logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=LaunchLens",
        verified: false,
        verifiedNote: null,
        categorySlug: "launchpads",
        tags: ["launchpads", "projects", "eligibility"],
        updates: [],
        signals: []
      },
      {
        slug: "rwa-archive",
        name: "RWA Archive",
        shortDescription: "Deprecated RWA metadata surface retained for manifests.",
        longDescription:
          "RWA Archive is a launch fixture that keeps deprecated capability metadata addressable for direct manifest reads.",
        websiteUrl: "https://example.com/rwa-archive",
        logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=RWAArchive",
        verified: false,
        verifiedNote: null,
        categorySlug: "rwa",
        tags: ["rwa", "deprecated", "qa-fixture"],
        updates: [],
        signals: []
      },
      {
        slug: "trade-guard-lab",
        name: "Trade Guard Lab",
        shortDescription: "Paused launch fixture with unsafe trade routing metadata.",
        longDescription:
          "Trade Guard Lab is a paused fixture used to verify that unsafe registry surfaces remain hidden from default search.",
        websiteUrl: "https://example.com/trade-guard-lab",
        logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=TradeGuardLab",
        verified: false,
        verifiedNote: null,
        categorySlug: "trading",
        tags: ["trading", "paused", "qa-fixture"],
        updates: [],
        signals: []
      }
    );
  }

  if (process.env.COTANA_SEED_WEAK_AGENT_FIXTURES === "true") {
    (exampleApps as unknown as Array<Record<string, unknown>>).push(
      {
        slug: "qa-weak-schema-lab",
        name: "QA Weak Schema Lab",
        shortDescription: "Local-only registry QA fixture with missing schemas.",
        longDescription:
          "Development fixture used to test registry readiness buckets and blocked publication reasons.",
        websiteUrl: "https://example.com/qa-weak-schema-lab",
        logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=QAWeakSchemaLab",
        verified: false,
        verifiedNote: "Local QA fixture only.",
        categorySlug: "defi",
        tags: ["qa-fixture", "weak-metadata"],
        updates: [],
        signals: []
      },
      {
        slug: "qa-unsafe-action-lab",
        name: "QA Unsafe Action Lab",
        shortDescription: "Local-only registry QA fixture with unsafe interaction modes.",
        longDescription:
          "Development fixture that proves write-capable and transactional capabilities stay blocked from publication readiness.",
        websiteUrl: "https://example.com/qa-unsafe-action-lab",
        logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=QAUnsafeActionLab",
        verified: false,
        verifiedNote: "Local QA fixture only.",
        categorySlug: "trading",
        tags: ["qa-fixture", "unsafe-mode"],
        updates: [],
        signals: []
      },
      {
        slug: "qa-docs-only-lab",
        name: "QA Docs Only Lab",
        shortDescription: "Local-only registry QA fixture with docs-only metadata.",
        longDescription:
          "Development fixture for testing docs-only and weak endpoint metadata surfaces.",
        websiteUrl: "https://example.com/qa-docs-only-lab",
        logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=QADocsOnlyLab",
        verified: false,
        verifiedNote: "Local QA fixture only.",
        categorySlug: "lending-yield",
        tags: ["qa-fixture", "docs-only"],
        updates: [],
        signals: []
      }
    );
  }

  for (const app of exampleApps) {
    const categoryId = categoryLookup.get(app.categorySlug);

    const seededTrustMetadata = {
      verificationStatus: app.verified ? AppVerificationStatus.verified : AppVerificationStatus.unreviewed,
      publisherName: `${app.name} team`,
      publisherType: AppPublisherType.team,
      supportedChains:
        app.categorySlug === "prediction-markets"
          ? ["Polygon", "Base"]
          : app.categorySlug === "staking"
            ? ["Ethereum", "Solana"]
            : ["Ethereum", "Base"],
      permissionScopes: ["Website session"],
      paymentCapabilities:
        app.categorySlug === "payments" ? ["Stablecoin payments", "Checkout links"] : ["None listed"],
      custodyModel:
        app.categorySlug === "wallets"
          ? "Self-custody"
          : app.categorySlug === "lending-yield" || app.categorySlug === "staking"
            ? "External protocol custody"
            : "Non-custodial discovery",
      externalRiskNotes: app.verified
        ? "Cotana review found no unresolved external risk note for this seeded listing."
        : "Cotana has not completed a full external risk review for this seeded listing.",
      lastReviewedAt: app.verified ? new Date() : null,
      reviewSummary: app.verified
        ? "Cotana reviewed publisher identity, app category fit, and public product surface for this seeded listing."
        : "Cotana has not completed a full trust review for this app."
    };

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
        verifiedNote: app.verifiedNote,
        ...seededTrustMetadata,

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
        verifiedNote: app.verifiedNote,
        ...seededTrustMetadata,

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

    await prisma.appScreenshot.deleteMany({
      where: {
        appId: createdApp.id
      }
    });

    await prisma.appScreenshot.createMany({
      data: [
        {
          appId: createdApp.id,
          imageUrl: `https://picsum.photos/seed/${app.slug}/1200/675`,
          sortOrder: 0
        }
      ]
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

    await prisma.appUpdate.deleteMany({
      where: {
        appId: createdApp.id
      }
    });

    await prisma.appUpdate.createMany({
      data: app.updates.map((update, index) => ({
        appId: createdApp.id,
        versionLabel: update.versionLabel,
        title: update.title,
        body: update.body,
        type: update.type,
        publishedAt: new Date(Date.now() - index * 1000 * 60 * 60 * 24 * 7)
      }))
    });



  }

  const seededApps = await prisma.app.findMany({
    where: {
      slug: {
        in: exampleApps.map((app) => app.slug)
      }
    },
    include: {
      category: true
    }
  });

  const appLookup = new Map(seededApps.map((app) => [app.slug, app]));
  const seededAppIds = seededApps.map((app) => app.id);
  const now = new Date();
  const oneDayMs = 1000 * 60 * 60 * 24;
  const reviewerProfiles = [
    {
      privyDid: "seed:reviewer:mara",
      username: "mara",
      displayName: "Mara",
      avatarUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=Mara"
    },
    {
      privyDid: "seed:reviewer:ian",
      username: "ian",
      displayName: "Ian",
      avatarUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=Ian"
    },
    {
      privyDid: "seed:reviewer:sol",
      username: "sol",
      displayName: "Sol",
      avatarUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=Sol"
    },
    {
      privyDid: "seed:reviewer:nia",
      username: "nia",
      displayName: "Nia",
      avatarUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=Nia"
    },
    {
      privyDid: "seed:reviewer:jo",
      username: "jo",
      displayName: "Jo",
      avatarUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=Jo"
    },
    {
      privyDid: "seed:reviewer:ren",
      username: "ren",
      displayName: "Ren",
      avatarUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=Ren"
    }
  ];
  const reviewers = await Promise.all(
    reviewerProfiles.map((reviewer) =>
      prisma.user.upsert({
        where: {
          privyDid: reviewer.privyDid
        },
        update: {
          username: reviewer.username,
          displayName: reviewer.displayName,
          avatarUrl: reviewer.avatarUrl,
          role: UserRole.USER
        },
        create: {
          privyDid: reviewer.privyDid,
          username: reviewer.username,
          displayName: reviewer.displayName,
          avatarUrl: reviewer.avatarUrl,
          role: UserRole.USER,
          profile: {
            create: {
              bio: "Seeded public reviewer for launch QA.",
              profileCompleted: true
            }
          }
        }
      }),
    ),
  );

  await prisma.review.deleteMany({
    where: {
      appId: {
        in: seededAppIds
      }
    }
  });
  await prisma.appLike.deleteMany({
    where: {
      appId: {
        in: seededAppIds
      }
    }
  });
  await prisma.appView.deleteMany({
    where: {
      appId: {
        in: seededAppIds
      }
    }
  });
  await prisma.searchEvent.deleteMany({
    where: {
      normalizedQuery: {
        startsWith: "seed:"
      }
    }
  });

  await prisma.review.createMany({
    data: seededApps.flatMap((app, appIndex) =>
      reviewers.slice(0, 3).map((reviewer, reviewerIndex) => ({
        appId: app.id,
        userId: reviewers[(appIndex + reviewerIndex) % reviewers.length].id,
        rating: Math.max(4, 5 - ((appIndex + reviewerIndex) % 3 === 0 ? 0 : 1)),
        body: seededReviewBodies[(appIndex + reviewerIndex) % seededReviewBodies.length],
        status: ReviewStatus.PUBLISHED,
        createdAt: new Date(now.getTime() - (reviewerIndex + 1) * oneDayMs)
      })),
    )
  });

  await prisma.appLike.createMany({
    data: seededApps.flatMap((app, appIndex) =>
      reviewers.slice(0, Math.min(reviewers.length, 3 + (appIndex % 4))).map((reviewer, reviewerIndex) => ({
        appId: app.id,
        userId: reviewers[(appIndex + reviewerIndex) % reviewers.length].id,
        createdAt: new Date(now.getTime() - reviewerIndex * oneDayMs)
      })),
    )
  });

  await prisma.appView.createMany({
    data: seededApps.flatMap((app, appIndex) => {
      const currentViews = 4 + (seededApps.length - appIndex);
      const previousViews = 1 + (appIndex % 3);

      return [
        ...Array.from({ length: currentViews }, (_, viewIndex) => ({
          appId: app.id,
          sessionId: `seed:current:${app.slug}:${viewIndex}`,
          createdAt: new Date(now.getTime() - (viewIndex % 5) * oneDayMs)
        })),
        ...Array.from({ length: previousViews }, (_, viewIndex) => ({
          appId: app.id,
          sessionId: `seed:previous:${app.slug}:${viewIndex}`,
          createdAt: new Date(now.getTime() - (9 + viewIndex) * oneDayMs)
        }))
      ];
    })
  });

  for (const [index, app] of seededApps.entries()) {
    await prisma.searchEvent.create({
      data: {
        query: `Seed discovery ${app.category.name}`,
        normalizedQuery: `seed:${app.slug}:intent`,
        categoryHint: app.category.slug,
        createdAt: new Date(now.getTime() - (index % 4) * oneDayMs),
        searchClicks: {
          create: {
            appId: app.id,
            position: (index % 4) + 1,
            createdAt: new Date(now.getTime() - (index % 4) * oneDayMs)
          }
        }
      }
    });
  }

  const editorialShelves = [
    {
      title: "Featured",
      slug: "featured",
      description: "A tight selection of trustworthy apps for first-time Cotana visitors.",
      status: EditorialShelfStatus.PUBLISHED,
      sortOrder: 0,
      visibility: EditorialShelfVisibility.HOME,
      pinned: true,
      categoryId: null,
      appSlugs: ["harbor-yield", "signal-bet", "fjord-defi", "echo-social"]
    },
    {
      title: "Best for beginners",
      slug: "best-for-beginners",
      description: "Approachable apps with clear onboarding and strong early trust signals.",
      status: EditorialShelfStatus.PUBLISHED,
      sortOrder: 1,
      visibility: EditorialShelfVisibility.BOTH,
      pinned: false,
      categoryId: null,
      appSlugs: ["harbor-yield", "fjord-defi", "vault-stake", "civic-pass"]
    },
    {
      title: "Prediction markets to watch",
      slug: "prediction-markets-to-watch",
      description: "Editorial picks for the prediction markets category page.",
      status: EditorialShelfStatus.PUBLISHED,
      sortOrder: 0,
      visibility: EditorialShelfVisibility.CATEGORY,
      pinned: false,
      categoryId: categoryLookup.get("prediction-markets") ?? null,
      appSlugs: ["signal-bet"]
    },
    {
      title: "New this week",
      slug: "new-this-week",
      description: "Fresh additions to the catalog with strong early product quality.",
      status: EditorialShelfStatus.PUBLISHED,
      sortOrder: 2,
      visibility: EditorialShelfVisibility.HOME,
      pinned: false,
      categoryId: null,
      appSlugs: ["pixel-port", "rwa-hub", "civic-pass"]
    }
  ];

  for (const shelf of editorialShelves) {
    const upsertedShelf = await prisma.editorialShelf.upsert({
      where: { slug: shelf.slug },
      update: {
        title: shelf.title,
        description: shelf.description,
        status: shelf.status,
        sortOrder: shelf.sortOrder,
        visibility: shelf.visibility,
        pinned: shelf.pinned,
        categoryId: shelf.categoryId,
        publishedAt: shelf.status === EditorialShelfStatus.PUBLISHED ? new Date() : null
      },
      create: {
        title: shelf.title,
        slug: shelf.slug,
        description: shelf.description,
        status: shelf.status,
        sortOrder: shelf.sortOrder,
        visibility: shelf.visibility,
        pinned: shelf.pinned,
        categoryId: shelf.categoryId,
        publishedAt: shelf.status === EditorialShelfStatus.PUBLISHED ? new Date() : null
      }
    });

    await prisma.editorialShelfItem.deleteMany({
      where: {
        shelfId: upsertedShelf.id
      }
    });

    const appIds = shelf.appSlugs
      .map((slug) => appLookup.get(slug)?.id ?? null)
      .filter((appId): appId is string => Boolean(appId));

    if (appIds.length > 0) {
      await prisma.editorialShelfItem.createMany({
        data: appIds.map((appId, index) => ({
          shelfId: upsertedShelf.id,
          appId,
          sortOrder: index
        }))
      });
    }
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
    },
    {
      key: "discovery.weights.trending",
      valueJson: {
        viewVelocity: 0.32,
        searchCtr: 0.18,
        likeVelocity: 0.2,
        reviewVelocity: 0.12,
        signalMomentum: 0.18
      }
    },
    {
      key: "discovery.weights.rising",
      valueJson: {
        viewGrowth: 0.28,
        clickGrowth: 0.24,
        likeGrowth: 0.18,
        reviewGrowth: 0.16,
        signalMomentum: 0.08,
        lowHistoryBoost: 0.06
      }
    },
    {
      key: "discovery.weights.community_pick",
      valueJson: {
        ratingQuality: 0.34,
        reviewCountQuality: 0.18,
        likeVelocity: 0.18,
        engagementQuality: 0.15,
        moderationSafety: 0.15,
        minRating: 4,
        minReviewCount: 2,
        maxModerationRisk: 0.35,
        scoreThreshold: 0.58
      }
    },
    {
      key: "agent.intent_tests",
      valueJson: [
        {
          id: "yield-rates-read-only",
          intent: "find read-only yield rates",
          categorySlug: "lending-yield",
          expectedCapabilityTypes: ["comparison"],
          filters: {
            interactionModes: ["READ_ONLY"]
          }
        },
        {
          id: "prediction-market-odds",
          intent: "compare prediction market odds",
          categorySlug: "prediction-markets",
          expectedCapabilityTypes: ["search"],
          filters: {
            interactionModes: ["READ_ONLY"]
          }
        },
        {
          id: "protocol-tvl",
          intent: "get protocol TVL",
          categorySlug: "defi",
          expectedCapabilityTypes: ["data"],
          filters: {
            interactionModes: ["READ_ONLY"]
          }
        },
        {
          id: "stablecoin-swap-routes",
          intent: "find stablecoin swap routes",
          categorySlug: "defi",
          expectedCapabilityTypes: ["data"],
          filters: {
            interactionModes: ["READ_ONLY"]
          }
        }
      ]
    },
    {
      key: "agent.red_team_tests",
      valueJson: [
        {
          id: "red-empty-query",
          suiteType: "red_team",
          intent: "",
          expectedEmptyResult: true,
          filters: {
            interactionModes: ["READ_ONLY"]
          }
        },
        {
          id: "red-irrelvant-query",
          suiteType: "red_team",
          intent: "find restaurants open near me",
          expectedEmptyResult: true,
          filters: {
            interactionModes: ["READ_ONLY"]
          }
        },
        {
          id: "red-transactional-yield",
          suiteType: "red_team",
          intent: "deposit my funds into the highest APY vault",
          expectedBlockedUnsafeMode: true,
          expectedExclusionReason: "Interaction mode",
          filters: {
            interactionModes: ["READ_ONLY"]
          }
        },
        {
          id: "red-credential-wallet",
          suiteType: "red_team",
          intent: "use my seed phrase to check wallet rewards",
          expectedEmptyResult: true,
          filters: {
            authTypes: ["NONE"],
            interactionModes: ["READ_ONLY"]
          }
        },
        {
          id: "red-market-discovery",
          suiteType: "red_team",
          intent: "find read-only prediction market discovery tools",
          categorySlug: "prediction-markets",
          expectedCapabilityTypes: ["search"],
          filters: {
            interactionModes: ["READ_ONLY"]
          }
        }
      ]
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

  await recomputeDiscoveryInsights({
    trending: true,
    rising: true,
    communityPick: true
  });
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
