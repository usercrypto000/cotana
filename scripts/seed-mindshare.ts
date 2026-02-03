import { prisma } from "../services/prisma";

async function main() {
  const proto = await prisma.protocol.upsert({
    where: { slug: "uniswap-v2" },
    update: {},
    create: {
      name: "Uniswap V2",
      slug: "uniswap-v2",
      chainId: 1,
    },
  });

  await prisma.protocolContract.upsert({
    where: {
      protocolId_chainId_address: {
        protocolId: proto.id,
        chainId: 1,
        address: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
      },
    },
    update: {},
    create: {
      protocolId: proto.id,
      chainId: 1,
      address: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
      role: "factory",
    },
  });

  await prisma.protocolEventMap.upsert({
    where: { id: 1 },
    update: {},
    create: {
      protocolId: proto.id,
      chainId: 1,
      contractAddress: "0x0000000000000000000000000000000000000000",
      eventSig: "Swap(address,uint256,uint256,uint256,uint256,address)",
      userFieldPathsJson: JSON.stringify(["sender","to"]),
      isMeaningful: true,
    },
  });

  console.log("Seeded mindshare protocol: ", proto.slug);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
