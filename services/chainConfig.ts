export type DexConfig = {
  name: string;
  type: "uniswap-v2" | "uniswap-v3";
  factory: string;
  router?: string;
};

export type ChainConfig = {
  id: number;
  name: string;
  shortName: string;
  rpcUrlEnv: string;
  confirmations: number;
  wrappedNative: string;
  stablecoins: string[];
  dexes: DexConfig[];
};

// TODO: expand dex factory/router lists per chain as protocols are added.
const chains: ChainConfig[] = [
  {
    id: 1,
    name: "Ethereum",
    shortName: "eth",
    rpcUrlEnv: "RPC_URL_ETH",
    confirmations: Number.parseInt(process.env.CONFIRMATIONS_ETH ?? "12", 10),
    wrappedNative: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    stablecoins: [
      "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      "0xdac17f958d2ee523a2206206994597c13d831ec7",
      "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    ],
    dexes: [
      {
        name: "uniswap-v2",
        type: "uniswap-v2",
        factory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
        router: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      },
      {
        name: "uniswap-v3",
        type: "uniswap-v3",
        factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
        router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      },
      {
        name: "sushiswap-v2",
        type: "uniswap-v2",
        factory: "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac",
        router: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
      },
    ],
  },
  {
    id: 42161,
    name: "Arbitrum",
    shortName: "arb",
    rpcUrlEnv: "RPC_URL_ARB",
    confirmations: Number.parseInt(process.env.CONFIRMATIONS_ARB ?? "12", 10),
    wrappedNative: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    stablecoins: [
      "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    ],
    dexes: [
      {
        name: "uniswap-v3",
        type: "uniswap-v3",
        factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
        router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      },
      {
        name: "sushiswap-v2",
        type: "uniswap-v2",
        factory: "0xc35DADB65012eC5796536bD9864eD8773aBc74C4",
        router: "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506",
      },
      {
        name: "uniswap-v2",
        type: "uniswap-v2",
        factory: "0xc5a2fC4fF1A4F6D47Aec9B2BdDe3f6E3d5c2F90",
      },
    ],
  },
  {
    id: 8453,
    name: "Base",
    shortName: "base",
    rpcUrlEnv: "RPC_URL_BASE",
    confirmations: Number.parseInt(process.env.CONFIRMATIONS_BASE ?? "12", 10),
    wrappedNative: "0x4200000000000000000000000000000000000006",
    stablecoins: [
      "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "0xD9Aa321f34a0855F33d9A12f9c20Ffd36f7A7B6C",
    ],
    dexes: [
      {
        name: "uniswap-v3",
        type: "uniswap-v3",
        factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
        router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      },
      {
        name: "uniswap-v2",
        type: "uniswap-v2",
        factory: "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6",
      },
    ],
  },
  {
    id: 56,
    name: "BNB Chain",
    shortName: "bnb",
    rpcUrlEnv: "RPC_URL_BNB",
    confirmations: Number.parseInt(process.env.CONFIRMATIONS_BNB ?? "5", 10),
    wrappedNative: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    stablecoins: [
      "0x55d398326f99059fF775485246999027B3197955",
      "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
      "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3",
    ],
    dexes: [
      {
        name: "pancakeswap-v2",
        type: "uniswap-v2",
        factory: "0xBCfCcbde45cE874adCB698cC183deBcF17952812",
        router: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
      },
      {
        name: "pancakeswap-v3",
        type: "uniswap-v3",
        factory: "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
      },
    ],
  },
];

export function listChains(): ChainConfig[] {
  return chains;
}

export function getChainConfig(chainId: number): ChainConfig | undefined {
  return chains.find((chain) => chain.id === chainId);
}

export function resolveRpcUrl(chain: ChainConfig): string {
  const envValue = process.env[chain.rpcUrlEnv];
  if (envValue && envValue.trim().length > 0) return envValue.trim();
  const alchemyKey = process.env.ALCHEMY_API_KEY;
  if (!alchemyKey) return "";
  if (chain.id === 1) return `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`;
  if (chain.id === 42161) return `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`;
  if (chain.id === 8453) return `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`;
  if (chain.id === 56) return `https://bnb-mainnet.g.alchemy.com/v2/${alchemyKey}`;
  return "";
}
