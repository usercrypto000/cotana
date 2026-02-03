import { prisma } from "../services/prisma";

async function main() {
  const protocol = await prisma.protocol.upsert({
    where: { slug: "uniswap-v3" },
    update: {},
    create: {
      name: "Uniswap V3",
      slug: "uniswap-v3",
      chainId: 1,
    },
  });

  const poolAddress = "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640";

  await prisma.protocolContract.upsert({
    where: {
      protocolId_chainId_address: {
        protocolId: protocol.id,
        chainId: 1,
        address: poolAddress.toLowerCase(),
      },
    },
    update: { role: "pool" },
    create: {
      protocolId: protocol.id,
      chainId: 1,
      address: poolAddress.toLowerCase(),
      role: "pool",
    },
  });

  const existingMap = await prisma.protocolEventMap.findFirst({
    where: {
      protocolId: protocol.id,
      chainId: 1,
      contractAddress: poolAddress.toLowerCase(),
      eventSig:
        "Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)",
    },
  });

  if (!existingMap) {
    await prisma.protocolEventMap.create({
      data: {
        protocolId: protocol.id,
        chainId: 1,
        contractAddress: poolAddress.toLowerCase(),
        eventSig:
          "Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)",
        userFieldPathsJson: ["recipient", "sender"],
        isMeaningful: true,
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });
