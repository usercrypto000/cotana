import type { PublicClient } from "viem";
import { erc20MetaAbi, pairMetaAbi, poolMetaAbi } from "@/services/ingest/abi";

type TokenMeta = {
  address: string;
  symbol: string;
  decimals: number;
  name: string;
};

type PairMeta = {
  token0: string;
  token1: string;
};

const tokenCache = new Map<string, TokenMeta>();
const pairCache = new Map<string, PairMeta>();
const poolCache = new Map<string, PairMeta>();

export async function getTokenMeta(client: PublicClient, address: string): Promise<TokenMeta> {
  const key = address.toLowerCase();
  const cached = tokenCache.get(key);
  if (cached) return cached;

  if (process.env.SKIP_TOKEN_META === "1") {
    const meta = { address: key, symbol: "TOKEN", decimals: 18, name: "TOKEN" };
    tokenCache.set(key, meta);
    return meta;
  }

  let symbol = "TOKEN";
  let decimals = 18;
  let name = "TOKEN";

  try {
    const results = await client.multicall({
      allowFailure: true,
      contracts: [
        { address, abi: erc20MetaAbi, functionName: "symbol" },
        { address, abi: erc20MetaAbi, functionName: "decimals" },
        { address, abi: erc20MetaAbi, functionName: "name" },
      ],
    });

    symbol = typeof results[0].result === "string" ? results[0].result : symbol;
    decimals = typeof results[1].result === "number" ? results[1].result : decimals;
    name = typeof results[2].result === "string" ? results[2].result : symbol;
  } catch {
    const [sym, dec, nm] = await Promise.allSettled([
      client.readContract({ address, abi: erc20MetaAbi, functionName: "symbol" }),
      client.readContract({ address, abi: erc20MetaAbi, functionName: "decimals" }),
      client.readContract({ address, abi: erc20MetaAbi, functionName: "name" }),
    ]);

    if (sym.status === "fulfilled" && typeof sym.value === "string") symbol = sym.value;
    if (dec.status === "fulfilled" && typeof dec.value === "number") decimals = dec.value;
    if (nm.status === "fulfilled" && typeof nm.value === "string") name = nm.value;
  }

  const meta = { address: key, symbol, decimals, name };
  tokenCache.set(key, meta);
  return meta;
}

export async function getPairTokens(client: PublicClient, address: string): Promise<PairMeta> {
  const key = address.toLowerCase();
  const cached = pairCache.get(key);
  if (cached) return cached;

  const [token0, token1] = await Promise.all([
    client.readContract({ address, abi: pairMetaAbi, functionName: "token0" }),
    client.readContract({ address, abi: pairMetaAbi, functionName: "token1" }),
  ]);

  const meta = {
    token0: (token0 as string).toLowerCase(),
    token1: (token1 as string).toLowerCase(),
  };
  pairCache.set(key, meta);
  return meta;
}

export async function getPoolTokens(client: PublicClient, address: string): Promise<PairMeta> {
  const key = address.toLowerCase();
  const cached = poolCache.get(key);
  if (cached) return cached;

  const [token0, token1] = await Promise.all([
    client.readContract({ address, abi: poolMetaAbi, functionName: "token0" }),
    client.readContract({ address, abi: poolMetaAbi, functionName: "token1" }),
  ]);

  const meta = {
    token0: (token0 as string).toLowerCase(),
    token1: (token1 as string).toLowerCase(),
  };
  poolCache.set(key, meta);
  return meta;
}
