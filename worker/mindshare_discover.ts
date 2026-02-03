import "dotenv/config";
import pino from "pino";
import { prisma } from "../services/prisma";
import { createPublicClient, http, getAddress } from "viem";

const logger = pino();

const RPC_URL = process.env.RPC_URL_ETH || process.env.ALCHEMY_ETH_HTTP || process.env.ALCHEMY_API_KEY;
if (!RPC_URL) throw new Error("RPC_URL_ETH is required");

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const BLOCK_WINDOW = Number(process.env.MINDSHARE_DISCOVER_BLOCKS ?? "300"); // ~ short window
const MIN_TX_COUNT = Number(process.env.MINDSHARE_DISCOVER_MIN_TX ?? "3");
const MIN_WALLETS = Number(process.env.MINDSHARE_DISCOVER_MIN_WALLETS ?? "2");
const TOP_N = Number(process.env.MINDSHARE_DISCOVER_TOP ?? "50");

const client = createPublicClient({ transport: http(RPC_URL) });

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "unknown"
  );
}

async function fetchEtherscanName(address: string) {
  if (!ETHERSCAN_API_KEY) return null;
  const url = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${ETHERSCAN_API_KEY}`;
  try {
    const res = await fetch(url);
    const json: any = await res.json();
    if (json?.status === "1" && Array.isArray(json.result) && json.result.length > 0) {
      const item = json.result[0];
      if (item.ContractName && item.ContractName !== "Contract") return item.ContractName as string;
    }
  } catch (e) {
    logger.debug({ e }, "etherscan fetch failed");
  }
  return null;
}

async function discover() {
  const latest = await client.getBlockNumber();
  const fromBlock =
    latest > BigInt(BLOCK_WINDOW) ? latest - BigInt(BLOCK_WINDOW) : BigInt(0);
  logger.info({ latest: Number(latest), fromBlock: Number(fromBlock) }, "scanning blocks for tx recipients");

  const addressCount = new Map<string, number>();
  const addressWallets = new Map<string, Set<string>>();

  for (let b = fromBlock; b <= latest; b++) {
    const block = await client.getBlock({ blockNumber: b, includeTransactions: true });
    for (const tx of block.transactions) {
      if (!tx.to) continue;
      const to = getAddress(tx.to);
      const from = getAddress(tx.from);
      addressCount.set(to, (addressCount.get(to) ?? 0) + 1);
      const set = addressWallets.get(to) ?? new Set<string>();
      set.add(from);
      addressWallets.set(to, set);
    }
  }

  const candidates = Array.from(addressCount.entries())
    .map(([addr, txCount]) => ({
      address: addr,
      txCount,
      wallets: addressWallets.get(addr)?.size ?? 0,
    }))
    .filter((c) => c.txCount >= MIN_TX_COUNT && c.wallets >= MIN_WALLETS)
    .sort((a, b) => b.wallets - a.wallets)
    .slice(0, TOP_N);

  logger.info({ candidates: candidates.length }, "discovered candidate contracts");

  const chainId = await client.getChainId();

  for (const cand of candidates) {
    const code = await client.getCode({ address: cand.address as `0x${string}` });
    if (!code || code === "0x" || code === "0x0") continue; // skip EOAs

    let name = (await fetchEtherscanName(cand.address)) ?? "Unknown";
    const slug = slugify(name);

    const protocol = await prisma.protocol.upsert({
      where: { slug },
      update: { name, chainId },
      create: { name, slug, chainId },
    });

    await prisma.protocolContract.upsert({
      where: {
        protocolId_chainId_address: {
          protocolId: protocol.id,
          chainId,
          address: cand.address.toLowerCase(),
        },
      },
      update: { role: "core" },
      create: {
        protocolId: protocol.id,
        chainId,
        address: cand.address.toLowerCase(),
        role: "core",
      },
    });
  }

  logger.info("discovery done");
}

discover()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    logger.error({ err: e }, "discovery failed");
    await prisma.$disconnect();
    process.exit(1);
  });
