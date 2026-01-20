import { parseAbiItem } from "viem";

export const erc20TransferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

export const uniV2SwapEvent = parseAbiItem(
  "event Swap(address indexed sender,uint256 amount0In,uint256 amount1In,uint256 amount0Out,uint256 amount1Out,address indexed to)"
);

export const uniV3SwapEvent = parseAbiItem(
  "event Swap(address indexed sender,address indexed recipient,int256 amount0,int256 amount1,uint160 sqrtPriceX96,uint128 liquidity,int24 tick)"
);

export const erc20MetaAbi = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function name() view returns (string)",
];

export const pairMetaAbi = [
  "function token0() view returns (address)",
  "function token1() view returns (address)",
];

export const poolMetaAbi = pairMetaAbi;
