import fs from "fs";
import path from "path";
import { prisma } from "../services/prisma";

type Row = {
  address: string;
  project: string;
  type: string;
  chain: string;
  details: string;
};

const FILE = path.join(process.cwd(), "data", "known-addresses.txt");

function parseFile(): Row[] {
  const content = fs.readFileSync(FILE, "utf-8");
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("\t"));

  const rows: Row[] = [];
  for (const line of lines) {
    const parts = line.split(/\t/);
    if (parts.length < 5) continue;
    const [address, project, type, chain, details] = parts;
    rows.push({ address, project, type, chain, details });
  }
  return rows;
}

function normalizeChain(chain: string) {
  const c = chain.toLowerCase();
  if (c.startsWith("eth")) return 1;
  if (c.startsWith("arbit")) return 42161;
  if (c.startsWith("base")) return 8453;
  if (c.startsWith("polygon") || c.startsWith("matic")) return 137;
  return null;
}

async function main() {
  const rows = parseFile();
  console.log(`parsed ${rows.length} rows from known-addresses.txt`);

  const grouped = new Map<
    string,
    { name: string; addresses: Array<{ chainId: number; address: string; type: string }> }
  >();

  for (const r of rows) {
    const chainId = normalizeChain(r.chain);
    if (!chainId) continue;
    const key = r.project.toLowerCase();
    const bucket = grouped.get(key) ?? { name: r.project, addresses: [] };
    bucket.addresses.push({ chainId, address: r.address.toLowerCase(), type: r.type });
    grouped.set(key, bucket);
  }

  for (const [key, item] of grouped) {
    const slug = key.replace(/\s+/g, "-").toLowerCase();
    const protocol = await prisma.protocol.upsert({
      where: { slug },
      update: { name: item.name },
      create: { name: item.name, slug, chainId: item.addresses[0]?.chainId ?? 1 },
    });

    for (const addr of item.addresses) {
      await prisma.protocolContract.upsert({
        where: {
          protocolId_chainId_address: {
            protocolId: protocol.id,
            chainId: addr.chainId,
            address: addr.address,
          },
        },
        update: { role: addr.type || "unknown" },
        create: {
          protocolId: protocol.id,
          chainId: addr.chainId,
          address: addr.address,
          role: addr.type || "unknown",
        },
      });
    }
    console.log(`upserted ${item.addresses.length} contracts for ${item.name}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
