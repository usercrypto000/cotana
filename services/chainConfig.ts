export type ChainConfig = {
  chainId: number;
  name: string;
  shortName: string;
  nativeSymbol: string;
  llamaPrefix: string;
  priceId: string;
  rpcUrls: string[];
};

function envRpc(name: string): string | null {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : null;
}

function withAlchemy(baseUrl: string): string[] {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) return [];
  return [`${baseUrl}${key}`];
}

const chains: ChainConfig[] = [
  {
    chainId: 1,
    name: "Ethereum",
    shortName: "eth",
    nativeSymbol: "ETH",
    llamaPrefix: "ethereum",
    priceId: "coingecko:ethereum",
    rpcUrls: [
      envRpc("RPC_ETHEREUM"),
      ...withAlchemy("https://eth-mainnet.g.alchemy.com/v2/"),
      "https://cloudflare-eth.com",
      "https://rpc.ankr.com/eth",
    ].filter(Boolean) as string[],
  },
  {
    chainId: 42161,
    name: "Arbitrum",
    shortName: "arb",
    nativeSymbol: "ETH",
    llamaPrefix: "arbitrum",
    priceId: "coingecko:ethereum",
    rpcUrls: [
      envRpc("RPC_ARBITRUM"),
      ...withAlchemy("https://arb-mainnet.g.alchemy.com/v2/"),
      "https://arb1.arbitrum.io/rpc",
      "https://rpc.ankr.com/arbitrum",
    ].filter(Boolean) as string[],
  },
  {
    chainId: 8453,
    name: "Base",
    shortName: "base",
    nativeSymbol: "ETH",
    llamaPrefix: "base",
    priceId: "coingecko:ethereum",
    rpcUrls: [
      envRpc("RPC_BASE"),
      ...withAlchemy("https://base-mainnet.g.alchemy.com/v2/"),
      "https://mainnet.base.org",
      "https://base-rpc.publicnode.com",
    ].filter(Boolean) as string[],
  },
  {
    chainId: 56,
    name: "BNB Chain",
    shortName: "bsc",
    nativeSymbol: "BNB",
    llamaPrefix: "bsc",
    priceId: "coingecko:binancecoin",
    rpcUrls: [
      envRpc("RPC_BNB"),
      "https://bsc-dataseed.binance.org",
      "https://rpc.ankr.com/bsc",
    ].filter(Boolean) as string[],
  },
];

export function getChainConfig(chainId: number): ChainConfig | undefined {
  return chains.find((chain) => chain.chainId === chainId);
}

export function listChains(): ChainConfig[] {
  return chains;
}
