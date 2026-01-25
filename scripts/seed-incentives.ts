import { prisma } from "../services/prisma";

const seedProjects = [
  {
    name: "Lumen",
    slug: "lumen",
    description: "Perp DEX with points runway and fee rebates.",
    website: "https://lumen.xyz",
    logoUrl: "/logos/lumen.png",
    chains: ["Ethereum", "Arbitrum", "Base"],
    tags: ["perps", "points"],
    links: [
      { tier: "TIER1", type: "DOCS", label: "Docs", url: "https://docs.lumen.xyz" },
      { tier: "TIER1", type: "BLOG", label: "Blog", url: "https://lumen.xyz/blog" },
    ],
    incentives: [
      {
        status: "EARLY",
        types: ["Points", "Volume"],
        rewardAssetType: "POINTS",
        rewardAssetSymbol: "LUM",
        rewardAssetChain: "Arbitrum",
        capitalRequired: "MED",
        timeIntensity: "SEMI",
        riskFlags: ["SC Risk", "Dilution"],
        saturationScore: 24,
        roiLabel: "High",
        effortLabel: "Medium",
        flowSummary: "2x volume multipliers live on Arbitrum with low wallet density.",
        statusRationale:
          "TVL growth >40%, mentions rising fast, per-user share still expanding.",
        lastUpdatedAt: new Date(),
      },
    ],
  },
  {
    name: "Flux",
    slug: "flux",
    description: "Liquidity incentives with emissions decaying by epoch.",
    website: "https://flux.fi",
    logoUrl: "/logos/flux.png",
    chains: ["Optimism", "Base", "Arbitrum", "Polygon"],
    tags: ["liquidity", "emissions"],
    links: [
      { tier: "TIER1", type: "DOCS", label: "Docs", url: "https://docs.flux.fi" },
    ],
    incentives: [
      {
        status: "ACTIVE",
        types: ["Yield", "Governance"],
        rewardAssetType: "TOKEN",
        rewardAssetSymbol: "FLX",
        rewardAssetChain: "Optimism",
        capitalRequired: "LOW",
        timeIntensity: "PASSIVE",
        riskFlags: ["Lockup"],
        saturationScore: 52,
        roiLabel: "Medium",
        effortLabel: "Low",
        flowSummary: "Stable emissions with governance boosts for long-tail pools.",
        statusRationale:
          "TVL growth 10-40% with steady wallet counts and stable emission share.",
        lastUpdatedAt: new Date(),
      },
    ],
  },
];

async function main() {
  for (const project of seedProjects) {
    const existing = await prisma.project.findUnique({ where: { slug: project.slug } });
    const created =
      existing ??
      (await prisma.project.create({
        data: {
          name: project.name,
          slug: project.slug,
          description: project.description,
          website: project.website,
          logoUrl: project.logoUrl,
          chains: project.chains,
          tags: project.tags,
          links: {
            create: project.links.map((link) => ({
              tier: link.tier as any,
              type: link.type as any,
              label: link.label,
              url: link.url,
            })),
          },
        },
      }));

    for (const incentive of project.incentives) {
      await prisma.incentive.create({
        data: {
          projectId: created.id,
          status: incentive.status as any,
          types: incentive.types,
          rewardAssetType: incentive.rewardAssetType as any,
          rewardAssetSymbol: incentive.rewardAssetSymbol,
          rewardAssetChain: incentive.rewardAssetChain,
          capitalRequired: incentive.capitalRequired as any,
          timeIntensity: incentive.timeIntensity as any,
          riskFlags: incentive.riskFlags,
          saturationScore: incentive.saturationScore,
          roiLabel: incentive.roiLabel,
          effortLabel: incentive.effortLabel,
          flowSummary: incentive.flowSummary,
          statusRationale: incentive.statusRationale,
          lastUpdatedAt: incentive.lastUpdatedAt,
        },
      });
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
