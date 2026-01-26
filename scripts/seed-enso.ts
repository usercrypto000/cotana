import { Prisma } from "@prisma/client";
import { prisma } from "../services/prisma";

const main = async () => {
  const project = await prisma.project.upsert({
    where: { slug: "enso" },
    create: {
      name: "ENSO",
      slug: "enso",
      raise: "$14.20M",
      website: "https://drop.enso.build/",
      description:
        "Native ENSO staking via validator delegation on EnsoDrop with epoch-based rewards.",
      chains: ["Ethereum"],
      tags: ["Staking"],
      archived: false,
      logoUrl: null,
    },
    update: {
      name: "ENSO",
      raise: "$14.20M",
      website: "https://drop.enso.build/",
      description:
        "Native ENSO staking via validator delegation on EnsoDrop with epoch-based rewards.",
      chains: ["Ethereum"],
      tags: ["Staking"],
      archived: false,
    },
  });

  const existingIncentive = await prisma.incentive.findFirst({
    where: { projectId: project.id, title: "Stake ENSO on EnsoDrop (515% APR)" },
  });

  const incentiveBase = {
    title: "Stake ENSO on EnsoDrop (515% APR)",
    description:
      "Delegate ENSO to a validator and lock 1-36 months to earn epoch rewards.",
    status: "EARLY",
    types: ["Staking", "Validator delegation"],
    defillamaSlug: "enso",
    rewardAssetType: "TOKEN",
    rewardAssetSymbol: "ENSO",
    rewardAssetAddress: null,
    rewardAssetChain: "Ethereum",
    apy: "515%",
    capitalRequired: "LOW",
    timeIntensity: "PASSIVE",
    riskFlags: ["Lockup", "Validator risk"],
    riskScore: 5,
    saturationScore: 25,
    flowSummary:
      "Buy/hold ENSO -> stake on EnsoDrop -> pick validator + lock duration -> earn epoch distributions -> claim on drop.enso.build.",
    howToExtract:
      "Go to drop.enso.build -> choose validator -> enter amount -> select 1-36 month lock -> stake -> claim after epoch distribution.",
    snapshotWindow: "Epoch-based",
    participationUrl: "https://drop.enso.build/",
    verified: true,
    startAt: new Date("2025-10-05"),
    endAt: null,
    statusRationale:
      "Early because staking is live and rewards are distributed by epochs, with validator slots expanding over time.",
    lastUpdatedAt: new Date(),
  } as Prisma.IncentiveUncheckedUpdateInput;

  const incentive = existingIncentive
    ? await prisma.incentive.update({
        where: { id: existingIncentive.id },
        data: incentiveBase,
      })
    : await prisma.incentive.create({
        data: {
          ...(incentiveBase as Prisma.IncentiveUncheckedCreateInput),
          projectId: project.id,
        },
      });

  await prisma.incentiveLink.deleteMany({ where: { incentiveId: incentive.id } });
  await prisma.incentiveLink.createMany({
    data: [
      {
        incentiveId: incentive.id,
        type: "DOCS",
        tier: "TIER1",
        label: "How to stake ENSO",
        url: "https://blog.enso.build/learn-how-to-stake-enso/",
      },
      {
        incentiveId: incentive.id,
        type: "DOCS",
        tier: "TIER1",
        label: "EnsoDrop pre-stake announcement",
        url: "https://blog.enso.build/ensodrop-pre-stake-enso-today/",
      },
      {
        incentiveId: incentive.id,
        type: "DOCS",
        tier: "TIER1",
        label: "Epoch 1 rewards distribution",
        url: "https://blog.enso.build/the-first-epoch-of-the-enso-network-has-concluded/",
      },
    ],
  });
};

main()
  .then(() => {
    console.log("ENSO seed complete");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
