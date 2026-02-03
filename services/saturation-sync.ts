import { prisma } from "./prisma";
import { computeSaturation } from "./saturation";

type SyncResult = {
  updated: number;
  skipped: number;
  errors: Array<{ incentiveId: number; reason: string }>;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 7;
const MAX_PAGES = 5;
const MAX_COUNT_HEX = "0x3e8";

const chainConfigs: Record<
  string,
  { network: string | null; avgBlockTimeSec: number }
> = {
  ethereum: { network: "eth-mainnet", avgBlockTimeSec: 12 },
  eth: { network: "eth-mainnet", avgBlockTimeSec: 12 },
  arbitrum: { network: "arb-mainnet", avgBlockTimeSec: 1 },
  arb: { network: "arb-mainnet", avgBlockTimeSec: 1 },
  optimism: { network: "opt-mainnet", avgBlockTimeSec: 2 },
  opt: { network: "opt-mainnet", avgBlockTimeSec: 2 },
  base: { network: "base-mainnet", avgBlockTimeSec: 2 },
  polygon: { network: "polygon-mainnet", avgBlockTimeSec: 2 },
  avalanche: { network: "avax-mainnet", avgBlockTimeSec: 2 },
  bnb: { network: null, avgBlockTimeSec: 3 },
  "bnb chain": { network: null, avgBlockTimeSec: 3 },
  starknet: { network: null, avgBlockTimeSec: 6 },
};

const normalizeChain = (value?: string | null) => {
  if (!value) return "";
  return value.toLowerCase().replace(/\s+chain$/, "").trim();
};

const getAlchemyUrl = (chainKey: string) => {
  const key = process.env.ALCHEMY_API_KEY ?? "";
  if (!key) return null;
  const config = chainConfigs[chainKey];
  if (!config?.network) return null;
  return `https://${config.network}.g.alchemy.com/v2/${key}`;
};

const extractAddresses = (value: string) => {
  const matches = value.match(/0x[a-fA-F0-9]{40,64}/g) ?? [];
  return matches.filter((item) => item.length === 42 || item.length === 66);
};

const toHex = (value: number) => `0x${value.toString(16)}`;

const fetchRpc = async (url: string, method: string, params: unknown[]) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });
  if (!res.ok) {
    throw new Error(`rpc_failed:${res.status}`);
  }
  const data = await res.json();
  if (data?.error) {
    throw new Error(`rpc_error:${data.error?.message ?? "unknown"}`);
  }
  return data?.result;
};

const fetchStarknetRpc = async (url: string, method: string, params: unknown[]) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });
  if (!res.ok) {
    throw new Error(`rpc_failed:${res.status}`);
  }
  const data = await res.json();
  if (data?.error) {
    throw new Error(`rpc_error:${data.error?.message ?? "unknown"}`);
  }
  return data?.result;
};

const getLatestBlock = async (url: string) => {
  const result = await fetchRpc(url, "eth_blockNumber", []);
  return Number.parseInt(String(result ?? "0x0"), 16);
};

const getFromBlock = async (url: string, chainKey: string) => {
  const latest = await getLatestBlock(url);
  const config = chainConfigs[chainKey];
  const avgBlockTime = config?.avgBlockTimeSec ?? 2;
  const estimatedBlocks = Math.floor((WINDOW_DAYS * DAY_MS) / 1000 / avgBlockTime);
  const from = Math.max(0, latest - estimatedBlocks);
  return toHex(from);
};

const fetchTransfers = async (url: string, contract: string, fromBlock: string) => {
  const transfers: any[] = [];
  let pageKey: string | undefined;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params: any = [
      {
        fromBlock,
        toBlock: "latest",
        toAddress: contract,
        category: ["external", "internal", "erc20", "erc721", "erc1155"],
        withMetadata: false,
        excludeZeroValue: false,
        maxCount: MAX_COUNT_HEX,
      },
    ];
    if (pageKey) {
      params[0].pageKey = pageKey;
    }
    const result = await fetchRpc(url, "alchemy_getAssetTransfers", params);
    const batch = Array.isArray(result?.transfers) ? result.transfers : [];
    transfers.push(...batch);
    pageKey = result?.pageKey;
    if (!pageKey) break;
  }

  return transfers;
};

const getContractStats = async (url: string, chainKey: string, address: string) => {
  const fromBlock = await getFromBlock(url, chainKey);
  const transfers = await fetchTransfers(url, address, fromBlock);
  const uniqueWallets = new Set<string>();
  const uniqueTx = new Set<string>();

  for (const transfer of transfers) {
    const from = String(transfer?.from ?? "").toLowerCase();
    if (from) uniqueWallets.add(from);
    const hash = String(transfer?.hash ?? "");
    if (hash) uniqueTx.add(hash);
  }

  return { wallets: uniqueWallets, txs: uniqueTx };
};

const getStarknetStats = async (url: string, address: string) => {
  const latest = await fetchStarknetRpc(url, "starknet_blockNumber", []);
  const latestNum = Number(latest ?? 0);
  const avgBlockTime = chainConfigs.starknet.avgBlockTimeSec;
  const estimatedBlocks = Math.floor((WINDOW_DAYS * DAY_MS) / 1000 / avgBlockTime);
  const from = Math.max(0, latestNum - estimatedBlocks);
  const uniqueTx = new Set<string>();
  const uniqueWallets = new Set<string>();
  let continuation: string | null = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const filter: any = {
      from_block: { block_number: from },
      to_block: "latest",
      address,
      chunk_size: 1000,
    };
    if (continuation) {
      filter.continuation_token = continuation;
    }
    const result = await fetchStarknetRpc(url, "starknet_getEvents", [filter]);
    const events = Array.isArray(result?.events) ? result.events : [];
    for (const event of events) {
      const txHash = String(event?.transaction_hash ?? "");
      if (txHash) uniqueTx.add(txHash);
    }
    continuation = result?.continuation_token ?? null;
    if (!continuation) break;
  }

  const hashes = Array.from(uniqueTx).slice(0, 200);
  for (const hash of hashes) {
    try {
      const tx = await fetchStarknetRpc(url, "starknet_getTransactionByHash", [hash]);
      const sender = String(tx?.sender_address ?? "");
      if (sender) uniqueWallets.add(sender.toLowerCase());
    } catch {
      // ignore individual tx failures
    }
  }

  return { wallets: uniqueWallets, txs: uniqueTx };
};

export const runSaturationSync = async (options?: { incentiveId?: number | null }) => {
  const incentives = await prisma.incentive.findMany({
    where: options?.incentiveId
      ? { id: options.incentiveId }
      : undefined,
    include: {
      proofs: true,
      project: true,
    },
  });

  const result: SyncResult = { updated: 0, skipped: 0, errors: [] };

  for (const incentive of incentives) {
    const addressSet = new Set<string>();
    for (const proof of incentive.proofs) {
      for (const addr of extractAddresses(`${proof.url} ${proof.label}`)) {
        addressSet.add(addr.toLowerCase());
      }
    }

    if (addressSet.size === 0) {
      result.skipped += 1;
      continue;
    }

    let chainKey = "";
    for (const proof of incentive.proofs) {
      const candidate = normalizeChain(proof.chain ?? "");
      if (candidate) {
        chainKey = candidate;
        break;
      }
    }
    if (!chainKey && incentive.rewardAssetChain) {
      chainKey = normalizeChain(incentive.rewardAssetChain);
    }
    if (!chainKey && incentive.project?.chains?.length) {
      chainKey = normalizeChain(incentive.project.chains[0]);
    }

    if (!chainKey) {
      result.errors.push({
        incentiveId: incentive.id,
        reason: "missing_chain",
      });
      continue;
    }

    const isStarknet = chainKey === "starknet";
    const url = isStarknet
      ? process.env.STARKNET_RPC_URL ?? ""
      : getAlchemyUrl(chainKey) ?? "";
    if (!url) {
      result.errors.push({
        incentiveId: incentive.id,
        reason: isStarknet ? "missing_starknet_rpc" : `unsupported_chain:${chainKey}`,
      });
      continue;
    }

    try {
      const wallets = new Set<string>();
      const txs = new Set<string>();
      for (const address of addressSet) {
        const stats = isStarknet
          ? await getStarknetStats(url, address)
          : await getContractStats(url, chainKey, address);
        stats.wallets.forEach((item) => wallets.add(item));
        stats.txs.forEach((item) => txs.add(item));
      }

      const totalUaw = wallets.size;
      const totalTx = txs.size;
      const saturation = computeSaturation(totalUaw, totalTx, incentive.endAt);

      await prisma.incentiveMetric.upsert({
        where: { incentiveId: incentive.id },
        update: {
          uaw7d: totalUaw,
          txCount7d: totalTx,
        },
        create: {
          incentiveId: incentive.id,
          uaw7d: totalUaw,
          txCount7d: totalTx,
        },
      });

      await prisma.incentive.update({
        where: { id: incentive.id },
        data: {
          saturationScore: saturation.score,
          status: saturation.status,
          lastUpdatedAt: new Date(),
        },
      });

      result.updated += 1;
    } catch (err) {
      result.errors.push({
        incentiveId: incentive.id,
        reason: String(err),
      });
    }
  }

  return result;
};
