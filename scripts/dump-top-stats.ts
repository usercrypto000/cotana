import { prisma } from "../services/prisma";

async function main() {
  const rows = await prisma.mindshareAddressStats.findMany({ where: { window: "24h" }, orderBy: { uaw_est: "desc" }, take: 20 });
  console.log("Top 24h stats:");
  for (const r of rows) {
    console.log(r.window, r.address, r.uaw_est, r.tx_count);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
