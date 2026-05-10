import {
  AgentAuthType,
  AgentCapabilityStatus,
  AgentInteractionMode,
  AgentInterfaceType,
  AgentListingStatus,
  AppAudience,
  AppStatus,
  AppUpdateType,
  EditorialShelfStatus,
  EditorialShelfVisibility,
  PrismaClient,
  UserRole
} from "@prisma/client";

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
      verifiedNote: "Established lending interface with strong product clarity and internal review completed.",
      agentAudience: AppAudience.HYBRID,
      agentSummary: "Agents can compare yield options and return read-only product recommendations for a user intent.",
      categorySlug: "lending-yield",
      tags: ["yield", "savings", "stablecoins"],
      agentCapabilities: [
        {
          name: "Compare yield options",
          slug: "compare-yield-options",
          description: "Returns a ranked read-only summary of available yield options for a requested asset profile.",
          capabilityType: "comparison",
          authType: AgentAuthType.API_KEY,
          interfaceType: AgentInterfaceType.HTTP_API,
          interactionMode: AgentInteractionMode.READ_ONLY,
          status: AgentCapabilityStatus.ACTIVE,
          endpointUrl: "https://example.com/harbor-yield/api/agent/yield-options",
          inputSchemaJson: {
            type: "object",
            properties: {
              asset: { type: "string" },
              riskPreference: { type: "string" }
            },
            required: ["asset"]
          },
          outputSchemaJson: {
            type: "object",
            properties: {
              options: { type: "array" }
            }
          },
          safetyNotes: "Read-only discovery capability. No account actions.",
          reliabilityScore: 0.92,
          latencyP50Ms: 480
        }
      ],
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
      agentAudience: AppAudience.HYBRID,
      agentSummary: "Agents can inspect market availability and summarize event-market context for a user.",
      categorySlug: "prediction-markets",
      tags: ["events", "markets", "forecasts"],
      agentCapabilities: [
        {
          name: "Find active markets",
          slug: "find-active-markets",
          description: "Searches active event markets and returns structured market summaries.",
          capabilityType: "search",
          authType: AgentAuthType.API_KEY,
          interfaceType: AgentInterfaceType.HTTP_API,
          interactionMode: AgentInteractionMode.READ_ONLY,
          status: AgentCapabilityStatus.ACTIVE,
          endpointUrl: "https://example.com/signal-bet/api/agent/markets",
          inputSchemaJson: {
            type: "object",
            properties: {
              topic: { type: "string" }
            },
            required: ["topic"]
          },
          outputSchemaJson: {
            type: "object",
            properties: {
              markets: { type: "array" }
            }
          },
          safetyNotes: "Market discovery only. No trading actions.",
          reliabilityScore: 0.88,
          latencyP50Ms: 620
        }
      ],
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
      agentAudience: AppAudience.HYBRID,
      agentSummary: "Agents can retrieve route and liquidity context for comparison workflows.",
      categorySlug: "defi",
      tags: ["defi", "liquidity", "swaps"],
      agentCapabilities: [
        {
          name: "Inspect liquidity routes",
          slug: "inspect-liquidity-routes",
          description: "Returns read-only liquidity route metadata for app comparison and discovery.",
          capabilityType: "data",
          authType: AgentAuthType.API_KEY,
          interfaceType: AgentInterfaceType.DATA_FEED,
          interactionMode: AgentInteractionMode.READ_ONLY,
          status: AgentCapabilityStatus.ACTIVE,
          endpointUrl: "https://example.com/fjord-defi/api/agent/routes",
          inputSchemaJson: {
            type: "object",
            properties: {
              assetPair: { type: "string" }
            },
            required: ["assetPair"]
          },
          outputSchemaJson: {
            type: "object",
            properties: {
              routes: { type: "array" }
            }
          },
          safetyNotes: "Read-only route inspection.",
          reliabilityScore: 0.9,
          latencyP50Ms: 540
        }
      ],
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
      agentAudience: AppAudience.HUMAN,
      agentSummary: null,
      categorySlug: "trading",
      tags: ["trading", "markets", "watchlists"],
      agentCapabilities: [],
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
      agentAudience: AppAudience.HYBRID,
      agentSummary: "Agents can fetch creator and community discovery metadata for planning workflows.",
      categorySlug: "social",
      tags: ["social", "creators", "communities"],
      agentCapabilities: [
        {
          name: "Discover communities",
          slug: "discover-communities",
          description: "Finds public communities and creators that match a topic.",
          capabilityType: "search",
          authType: AgentAuthType.OAUTH2,
          interfaceType: AgentInterfaceType.HTTP_API,
          interactionMode: AgentInteractionMode.READ_ONLY,
          status: AgentCapabilityStatus.ACTIVE,
          endpointUrl: "https://example.com/echo-social/api/agent/communities",
          inputSchemaJson: {
            type: "object",
            properties: {
              topic: { type: "string" }
            },
            required: ["topic"]
          },
          outputSchemaJson: {
            type: "object",
            properties: {
              communities: { type: "array" }
            }
          },
          safetyNotes: "Public discovery metadata only.",
          reliabilityScore: 0.84,
          latencyP50Ms: 720
        }
      ],
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
      agentAudience: AppAudience.HUMAN,
      agentSummary: null,
      categorySlug: "staking",
      tags: ["staking", "validators", "guides"],
      agentCapabilities: [],
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
      agentAudience: AppAudience.AGENT,
      agentSummary: "Agents can request eligibility and verification-status checks through structured, permissioned workflows.",
      categorySlug: "identity",
      tags: ["identity", "trust", "access"],
      agentCapabilities: [
        {
          name: "Check verification status",
          slug: "check-verification-status",
          description: "Returns a scoped status response for permissioned identity workflows.",
          capabilityType: "workflow",
          authType: AgentAuthType.OAUTH2,
          interfaceType: AgentInterfaceType.HTTP_API,
          interactionMode: AgentInteractionMode.READ_ONLY,
          status: AgentCapabilityStatus.ACTIVE,
          endpointUrl: "https://example.com/civic-pass/api/agent/status",
          inputSchemaJson: {
            type: "object",
            properties: {
              requestId: { type: "string" }
            },
            required: ["requestId"]
          },
          outputSchemaJson: {
            type: "object",
            properties: {
              status: { type: "string" }
            }
          },
          safetyNotes: "Requires delegated user consent.",
          reliabilityScore: 0.94,
          latencyP50Ms: 360
        }
      ],
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
      agentAudience: AppAudience.HUMAN,
      agentSummary: null,
      categorySlug: "gaming",
      tags: ["gaming", "quests", "worlds"],
      agentCapabilities: [],
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
      agentAudience: AppAudience.HYBRID,
      agentSummary: "Agents can pull comparison metadata for asset-backed products.",
      categorySlug: "rwa",
      tags: ["rwa", "assets", "comparison"],
      agentCapabilities: [
        {
          name: "Compare asset products",
          slug: "compare-asset-products",
          description: "Returns structured comparison metadata for asset-backed products.",
          capabilityType: "comparison",
          authType: AgentAuthType.API_KEY,
          interfaceType: AgentInterfaceType.HTTP_API,
          interactionMode: AgentInteractionMode.READ_ONLY,
          status: AgentCapabilityStatus.ACTIVE,
          endpointUrl: "https://example.com/rwa-hub/api/agent/products",
          inputSchemaJson: {
            type: "object",
            properties: {
              assetType: { type: "string" }
            },
            required: ["assetType"]
          },
          outputSchemaJson: {
            type: "object",
            properties: {
              products: { type: "array" }
            }
          },
          safetyNotes: "Read-only comparison data.",
          reliabilityScore: 0.86,
          latencyP50Ms: 690
        }
      ],
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

  for (const app of exampleApps) {
    const categoryId = categoryLookup.get(app.categorySlug);
    const agentListingStatus =
      app.agentAudience === AppAudience.HUMAN ? AgentListingStatus.NOT_APPLICABLE : AgentListingStatus.PUBLISHED;
    const agentDocsUrl =
      app.agentAudience === AppAudience.HUMAN ? null : `https://example.com/${app.slug}/docs/agents`;

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
        agentAudience: app.agentAudience,
        agentListingStatus,
        agentSummary: app.agentSummary,
        agentDocsUrl,
        agentIntegrationNotes:
          app.agentAudience === AppAudience.HUMAN
            ? null
            : "Seeded as a discovery-only registry listing. Cotana does not execute this capability.",
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
        agentAudience: app.agentAudience,
        agentListingStatus,
        agentSummary: app.agentSummary,
        agentDocsUrl,
        agentIntegrationNotes:
          app.agentAudience === AppAudience.HUMAN
            ? null
            : "Seeded as a discovery-only registry listing. Cotana does not execute this capability.",
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

    await prisma.agentCapability.deleteMany({
      where: {
        appId: createdApp.id
      }
    });

    if (app.agentCapabilities.length > 0) {
      await prisma.agentCapability.createMany({
        data: app.agentCapabilities.map((capability) => ({
          appId: createdApp.id,
          name: capability.name,
          slug: capability.slug,
          description: capability.description,
          capabilityType: capability.capabilityType,
          authType: capability.authType,
          interfaceType: capability.interfaceType,
          interactionMode: capability.interactionMode,
          endpointUrl: capability.endpointUrl,
          docsUrl: `https://example.com/${app.slug}/docs/agents#${capability.slug}`,
          inputSchemaJson: capability.inputSchemaJson,
          outputSchemaJson: capability.outputSchemaJson,
          safetyNotes: capability.safetyNotes,
          status: capability.status,
          reliabilityScore: capability.reliabilityScore,
          latencyP50Ms: capability.latencyP50Ms
        }))
      });
    }
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
