import { prisma } from "../services/prisma";

function randHex(len = 40) {
  const hex = "0123456789abcdef";
  let s = "";
  for (let i = 0; i < len; i++) s += hex[Math.floor(Math.random() * hex.length)];
  return `0x${s}`;
}

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const CHAIN_ID = 1;

  // create contract addresses
  const TOTAL_CONTRACTS = 120;
  const contracts: string[] = [];
  for (let i = 0; i < TOTAL_CONTRACTS; i++) contracts.push(randHex());

  // mark contracts in cache
  const cacheData = contracts.map((a) => ({ chainId: CHAIN_ID, address: a.toLowerCase(), isContract: true }));
  // upsert via createMany with skipDuplicates
  await prisma.addressContractCache.createMany({ data: cacheData, skipDuplicates: true });

  // create top and medium sets
  const topContracts = contracts.slice(0, 5);
  const mediumContracts = contracts.slice(5, 25);
  const rest = contracts.slice(25);

  const interactions: any[] = [];

  // helper to generate wallets
  function genWallets(n: number) {
    const w: string[] = [];
    for (let i = 0; i < n; i++) w.push(randHex());
    return w;
  }

  // top contracts: 200-500 unique wallets each
  for (const c of topContracts) {
    const uniq = 200 + Math.floor(Math.random() * 301);
    const wallets = genWallets(uniq);
    for (let i = 0; i < wallets.length; i++) {
      const w = wallets[i].toLowerCase();
      const times = 1 + Math.floor(Math.random() * 3);
      for (let t = 0; t < times; t++) {
        const when = randomTimestampWeighted();
        interactions.push({ chainId: CHAIN_ID, address: c.toLowerCase(), wallet: w, txHash: randHex(64), blockNumber: BigInt(17000000) - BigInt(Math.floor((Date.now() - when.getTime()) / 1000 / 12)), blockTime: when });
      }
    }
  }

  // medium: 30-100 wallets
  for (const c of mediumContracts) {
    const uniq = 30 + Math.floor(Math.random() * 71);
    const wallets = genWallets(uniq);
    for (const w of wallets) {
      const times = 1 + Math.floor(Math.random() * 2);
      for (let t = 0; t < times; t++) {
        const when = randomTimestampWeighted();
        interactions.push({ chainId: CHAIN_ID, address: c.toLowerCase(), wallet: w.toLowerCase(), txHash: randHex(64), blockNumber: BigInt(17000000) - BigInt(Math.floor((Date.now() - when.getTime()) / 1000 / 12)), blockTime: when });
      }
    }
  }

  // small for rest
  for (const c of rest) {
    const uniq = 1 + Math.floor(Math.random() * 10);
    const wallets = genWallets(uniq);
    for (const w of wallets) {
      const times = 1;
      for (let t = 0; t < times; t++) {
        const when = randomTimestampWeighted(0.2);
        interactions.push({ chainId: CHAIN_ID, address: c.toLowerCase(), wallet: w.toLowerCase(), txHash: randHex(64), blockNumber: BigInt(17000000) - BigInt(Math.floor((Date.now() - when.getTime()) / 1000 / 12)), blockTime: when });
      }
    }
  }

  // add bot wallets that spam
  const botWallets = genWallets(5).map((b) => b.toLowerCase());
  for (const bot of botWallets) {
    // spam 300-800 interactions across a few contracts
    const spamCount = 300 + Math.floor(Math.random() * 501);
    for (let i = 0; i < spamCount; i++) {
      const c = pick([...topContracts, ...mediumContracts]).toLowerCase();
      const when = recentBurstTimestamp();
      interactions.push({ chainId: CHAIN_ID, address: c, wallet: bot, txHash: randHex(64), blockNumber: BigInt(17000000) - BigInt(Math.floor((Date.now() - when.getTime()) / 1000 / 12)), blockTime: when });
    }
  }

  console.log("Total interactions to insert:", interactions.length);

  // batch insert in chunks
  const CHUNK = 1000;
  for (let i = 0; i < interactions.length; i += CHUNK) {
    const chunk = interactions.slice(i, i + CHUNK);
    await prisma.addressInteraction.createMany({ data: chunk, skipDuplicates: true });
    console.log(`Inserted chunk ${i}..${i + chunk.length}`);
  }

  // seed metadata for top 10 contracts
  const seedMeta = contracts.slice(0, 10).map((a, idx) => ({ chainId: CHAIN_ID, address: a.toLowerCase(), label: `seeded-contract-${idx + 1}`, labelSource: "seed", confidence: 90, isVerified: true }));
  await prisma.addressMetadata.createMany({ data: seedMeta, skipDuplicates: true });

  console.log("Seeding complete");
}

function randomTimestampWeighted(recentProb = 0.6) {
  const now = Date.now();
  // with recentProb probability pick in last 24h, otherwise pick in last 7d
  if (Math.random() < recentProb) {
    return new Date(now - Math.floor(Math.random() * 24 * 60 * 60 * 1000));
  }
  return new Date(now - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));
}

function recentBurstTimestamp() {
  // produce timestamps within last hour to simulate spam
  return new Date(Date.now() - Math.floor(Math.random() * 60 * 60 * 1000));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
