import { prisma } from "../services/prisma";

async function main() {
  const cursor = await prisma.mindshareCursor.findMany();
  console.log("MindshareCursor:", cursor);

  const cnt = await prisma.addressInteraction.count();
  console.log("AddressInteraction count:", cnt);

  const sample = await prisma.addressInteraction.findMany({ take: 5, orderBy: { createdAt: "desc" } });
  console.log("Sample interactions:", sample);

  const statsCount = await prisma.mindshareAddressStats.count();
  console.log("MindshareAddressStats count:", statsCount);

  const metaCount = await prisma.addressMetadata.count();
  console.log("AddressMetadata count:", metaCount);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
