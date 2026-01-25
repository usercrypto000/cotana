import { prisma } from "../services/prisma";

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const now = new Date();

const items = [
  {
    project_name: "Binance WLFI/USD1",
    category: "CEX/Stablecoin",
    chains: ["Multi"],
    status: "ACTIVE",
    incentive_types: ["Airdrop", "Yield/Emissions"],
    reward_asset: "WLFI",
    participation_surface: "CEX program",
    capital_required: "LOW",
    time_intensity: "PASSIVE",
    key_dates: { start: "2026-01-23", end: "2026-02-20", snapshot: "Weekly" },
    metrics: { reward_pool: 40000000 },
    saturation_signals: "Weekly distribution, high CEX liquidity",
    risk_flags: ["Custody (CEX)", "Stablecoin dependency"],
    links: [
      {
        label: "Binance announcement",
        url:
          "https://www.binance.com/en/support/announcement/binance-launches-usd1-promotion-with-40-000-000-wlfi-in-rewards-0a5b4c7d6d7c4f6c9a5c7d6d7c4f6c9a",
        type: "BLOG",
        tier: "TIER1",
      },
    ],
    verification_level: "Verified",
    confidence: 98,
    why_track: "$40M reward pool, Trump-affiliated narrative, simple participation",
  },
  {
    project_name: "Solana Mobile (SKR)",
    category: "Mobile/Wallet",
    chains: ["Solana"],
    status: "ACTIVE",
    incentive_types: ["Airdrop"],
    reward_asset: "SKR",
    participation_surface: "Native app (Seeker wallet)",
    capital_required: "MED",
    time_intensity: "PASSIVE",
    key_dates: { start: "2026-01-21", end: "2026-04-21", snapshot: "2025-08-31" },
    metrics: { reward_pool: 2000000000 },
    saturation_signals: "150K+ preorders, 100K eligible claims",
    risk_flags: ["Custody (phone-based)", "Hardware dependency"],
    links: [
      { label: "Solana Mobile", url: "https://solana.com/mobile/skr", type: "APP", tier: "TIER1" },
      { label: "SKR Docs", url: "https://docs.solanamobile.com/tokenomics/skr", type: "DOCS", tier: "TIER1" },
    ],
    verification_level: "Verified",
    confidence: 95,
    why_track: "Massive ecosystem alignment, 10B token supply with staking inflation",
  },
  {
    project_name: "Arbitrum DRIP Season 1",
    category: "L2/DeFi",
    chains: ["Arbitrum"],
    status: "ACTIVE",
    incentive_types: ["Yield/Emissions", "Points"],
    reward_asset: "ARB",
    participation_surface: "DEX, Lending, Staking",
    capital_required: "MED",
    time_intensity: "SEMI",
    key_dates: { start: "2026-01-15", end: "2026-03-31" },
    metrics: { tvl: 5518180000, tvl_7d_chg: 2.3, reward_pool: 40000000 },
    saturation_signals: "New assets added (siUSD, wsrUSD), growing TVL",
    risk_flags: ["Smart contract risk", "L2 bridge risk"],
    links: [
      {
        label: "DRIP Season 1",
        url: "https://arbitrum.foundation/drip-season1",
        type: "BLOG",
        tier: "TIER1",
      },
      {
        label: "Incentives Docs",
        url: "https://docs.arbitrum.foundation/incentives/drip",
        type: "DOCS",
        tier: "TIER1",
      },
    ],
    verification_level: "Verified",
    confidence: 94,
    why_track: "$40M ARB allocation, major L2 liquidity incentive program",
  },
  {
    project_name: "Kamino Finance",
    category: "DeFi/Lending",
    chains: ["Solana"],
    status: "ACTIVE",
    incentive_types: ["Points", "Yield/Emissions"],
    reward_asset: "Points (future KMNO)",
    participation_surface: "Liquidity vaults, Multiply strategies",
    capital_required: "MED",
    time_intensity: "SEMI",
    key_dates: { start: "2026-01-01", end: "Ongoing" },
    metrics: { tvl: 997240000, tvl_7d_chg: 5.1 },
    saturation_signals: "235K active wallets, down from peak but stable",
    risk_flags: ["Smart contract risk", "Leverage risk"],
    links: [
      {
        label: "KMNO Points Docs",
        url: "https://docs.kamino.finance/kmno/points",
        type: "DOCS",
        tier: "TIER1",
      },
      {
        label: "Kamino App",
        url: "https://app.kamino.finance/points",
        type: "APP",
        tier: "TIER1",
      },
    ],
    verification_level: "Verified",
    confidence: 93,
    why_track: "Capital efficiency leader on Solana, 10-50x point multipliers active",
  },
];

const mapRewardType = (rewardAsset: string) => {
  if (rewardAsset.toLowerCase().includes("point")) {
    return { type: "POINTS", symbol: "KMNO" };
  }
  return { type: "TOKEN", symbol: rewardAsset.replace(/\\s+.*$/, "") };
};

async function main() {
  for (const item of items) {
    const slug = toSlug(item.project_name);
    const project = await prisma.project.upsert({
      where: { slug },
      update: {
        name: item.project_name,
        description: item.participation_surface,
        chains: item.chains,
        tags: [item.category],
      },
      create: {
        name: item.project_name,
        slug,
        description: item.participation_surface,
        chains: item.chains,
        tags: [item.category],
      },
    });

    await prisma.projectLink.deleteMany({ where: { projectId: project.id } });
    await prisma.projectLink.createMany({
      data: item.links.map((link) => ({
        projectId: project.id,
        label: link.label,
        url: link.url,
        type: link.type as any,
        tier: link.tier as any,
      })),
    });

    const reward = mapRewardType(item.reward_asset);
    const existing = await prisma.incentive.findFirst({
      where: { projectId: project.id },
    });

    const data = {
      projectId: project.id,
      status: item.status as any,
      types: item.incentive_types,
      rewardAssetType: reward.type as any,
      rewardAssetSymbol: reward.symbol,
      capitalRequired: item.capital_required as any,
      timeIntensity: item.time_intensity as any,
      riskFlags: item.risk_flags,
      flowSummary: item.why_track,
      statusRationale: item.saturation_signals,
      lastUpdatedAt: now,
      startAt: new Date(item.key_dates.start),
      endAt:
        item.key_dates.end && item.key_dates.end !== "Ongoing"
          ? new Date(item.key_dates.end)
          : null,
    };

    if (existing) {
      await prisma.incentive.update({ where: { id: existing.id }, data });
    } else {
      await prisma.incentive.create({ data });
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
