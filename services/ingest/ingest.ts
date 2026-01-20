import {
  createPublicClient,
  decodeEventLog,
  formatEther,
  formatUnits,
  http,
  type PublicClient,
} from "viem";
import { prisma } from "@/services/prisma";
import { listChains, resolveRpcUrl } from "@/services/chainConfig";
import { erc20TransferEvent, uniV2SwapEvent, uniV3SwapEvent } from "@/services/ingest/abi";
import { getPairTokens, getPoolTokens, getTokenMeta } from "@/services/ingest/cache";

type RangeInput = {
  chainId: number;
  fromBlock: bigint;
  toBlock: bigint;
};

function getClient(chainId: number): PublicClient {
  const chain = listChains().find((item) => item.id === chainId);
  if (!chain) {
    throw new Error(`Unknown chain ${chainId}`);
  }
  const rpcUrl = resolveRpcUrl(chain);
  if (!rpcUrl) {
    throw new Error(`Missing RPC URL for ${chain.name}`);
  }
  return createPublicClient({ transport: http(rpcUrl) });
}

async function resetBlock(chainId: number, blockNumber: bigint) {
  await prisma.tokenTransfer.deleteMany({ where: { chainId, blockNumber } });
  await prisma.swap.deleteMany({ where: { chainId, blockNumber } });
  await prisma.log.deleteMany({ where: { chainId, blockNumber } });
  await prisma.transaction.deleteMany({ where: { chainId, blockNumber } });
  await prisma.block.deleteMany({ where: { chainId, number: blockNumber } });
}

function abs(value: bigint) {
  return value < 0n ? value * -1n : value;
}

export async function ingestRange({ chainId, fromBlock, toBlock }: RangeInput) {
  const client = getClient(chainId);

  for (let current = fromBlock; current <= toBlock; current += 1n) {
    const block = await client.getBlock({ blockNumber: current, includeTransactions: true });
    if (!block) continue;

    const existing = await prisma.block.findUnique({
      where: { chainId_number: { chainId, number: current } },
      select: { hash: true },
    });

    if (existing && existing.hash.toLowerCase() !== block.hash.toLowerCase()) {
      await resetBlock(chainId, current);
    }

    await prisma.block.upsert({
      where: { chainId_number: { chainId, number: current } },
      update: {
        hash: block.hash.toLowerCase(),
        parentHash: block.parentHash.toLowerCase(),
        timestamp: Number(block.timestamp ?? 0n),
      },
      create: {
        chainId,
        number: current,
        hash: block.hash.toLowerCase(),
        parentHash: block.parentHash.toLowerCase(),
        timestamp: Number(block.timestamp ?? 0n),
      },
    });

    const txMap = new Map<string, (typeof block.transactions)[number]>();
    for (const tx of block.transactions) {
      txMap.set(tx.hash.toLowerCase(), tx);
      await prisma.transaction.upsert({
        where: { chainId_hash: { chainId, hash: tx.hash.toLowerCase() } },
        update: {
          blockNumber: current,
          from: tx.from.toLowerCase(),
          to: tx.to ? tx.to.toLowerCase() : null,
          value: tx.value ?? 0n,
        },
        create: {
          chainId,
          hash: tx.hash.toLowerCase(),
          blockNumber: current,
          from: tx.from.toLowerCase(),
          to: tx.to ? tx.to.toLowerCase() : null,
          value: tx.value ?? 0n,
          status: null,
        },
      });
    }

    const transferLogs = await client.getLogs({
      fromBlock: current,
      toBlock: current,
      event: erc20TransferEvent,
    });

    const v2Logs = await client.getLogs({
      fromBlock: current,
      toBlock: current,
      event: uniV2SwapEvent,
    });

    const v3Logs = await client.getLogs({
      fromBlock: current,
      toBlock: current,
      event: uniV3SwapEvent,
    });

    const logs = [...transferLogs, ...v2Logs, ...v3Logs];

    for (const log of logs) {
      await prisma.log.upsert({
        where: {
          chainId_txHash_logIndex: {
            chainId,
            txHash: log.transactionHash.toLowerCase(),
            logIndex: log.logIndex,
          },
        },
        update: {
          blockNumber: current,
          address: log.address.toLowerCase(),
          topic0: log.topics[0]?.toLowerCase() ?? null,
          topics: log.topics.map((topic) => topic.toLowerCase()),
          data: log.data.toLowerCase(),
        },
        create: {
          chainId,
          txHash: log.transactionHash.toLowerCase(),
          logIndex: log.logIndex,
          blockNumber: current,
          address: log.address.toLowerCase(),
          topic0: log.topics[0]?.toLowerCase() ?? null,
          topics: log.topics.map((topic) => topic.toLowerCase()),
          data: log.data.toLowerCase(),
        },
      });
    }

    for (const log of transferLogs) {
      const decoded = decodeEventLog({ abi: [erc20TransferEvent], data: log.data, topics: log.topics });
      const from = (decoded.args.from as string).toLowerCase();
      const to = (decoded.args.to as string).toLowerCase();
      const value = decoded.args.value as bigint;
      const tokenAddress = log.address.toLowerCase();

      const meta = await getTokenMeta(client, tokenAddress);
      await prisma.token.upsert({
        where: { chainId_address: { chainId, address: tokenAddress } },
        update: { symbol: meta.symbol, decimals: meta.decimals, name: meta.name },
        create: { chainId, address: tokenAddress, symbol: meta.symbol, decimals: meta.decimals, name: meta.name },
      });

      await prisma.tokenTransfer.upsert({
        where: {
          chainId_txHash_logIndex: {
            chainId,
            txHash: log.transactionHash.toLowerCase(),
            logIndex: log.logIndex,
          },
        },
        update: {
          token: tokenAddress,
          from,
          to,
          amountRaw: value,
          amountDec: formatUnits(value, meta.decimals),
          timestamp: Number(block.timestamp ?? 0n),
        },
        create: {
          chainId,
          txHash: log.transactionHash.toLowerCase(),
          logIndex: log.logIndex,
          blockNumber: current,
          token: tokenAddress,
          from,
          to,
          amountRaw: value,
          amountDec: formatUnits(value, meta.decimals),
          timestamp: Number(block.timestamp ?? 0n),
        },
      });
    }

    for (const log of v2Logs) {
      const decoded = decodeEventLog({ abi: [uniV2SwapEvent], data: log.data, topics: log.topics });
      const pairTokens = await getPairTokens(client, log.address);
      const tx = txMap.get(log.transactionHash.toLowerCase());

      const amount0In = decoded.args.amount0In as bigint;
      const amount1In = decoded.args.amount1In as bigint;
      const amount0Out = decoded.args.amount0Out as bigint;
      const amount1Out = decoded.args.amount1Out as bigint;

      let tokenIn = "";
      let tokenOut = "";
      let amountIn = 0n;
      let amountOut = 0n;

      if (amount0In > 0n && amount1Out > 0n) {
        tokenIn = pairTokens.token0;
        tokenOut = pairTokens.token1;
        amountIn = amount0In;
        amountOut = amount1Out;
      } else if (amount1In > 0n && amount0Out > 0n) {
        tokenIn = pairTokens.token1;
        tokenOut = pairTokens.token0;
        amountIn = amount1In;
        amountOut = amount0Out;
      } else {
        continue;
      }

      const metaIn = await getTokenMeta(client, tokenIn);
      const metaOut = await getTokenMeta(client, tokenOut);

      await prisma.token.upsert({
        where: { chainId_address: { chainId, address: tokenIn } },
        update: { symbol: metaIn.symbol, decimals: metaIn.decimals, name: metaIn.name },
        create: { chainId, address: tokenIn, symbol: metaIn.symbol, decimals: metaIn.decimals, name: metaIn.name },
      });
      await prisma.token.upsert({
        where: { chainId_address: { chainId, address: tokenOut } },
        update: { symbol: metaOut.symbol, decimals: metaOut.decimals, name: metaOut.name },
        create: { chainId, address: tokenOut, symbol: metaOut.symbol, decimals: metaOut.decimals, name: metaOut.name },
      });

      await prisma.swap.upsert({
        where: {
          chainId_txHash_logIndex: {
            chainId,
            txHash: log.transactionHash.toLowerCase(),
            logIndex: log.logIndex,
          },
        },
        update: {
          dex: "uniswap-v2",
          pool: log.address.toLowerCase(),
          trader: tx?.from.toLowerCase() ?? null,
          tokenIn,
          tokenOut,
          amountInRaw: amountIn,
          amountOutRaw: amountOut,
          amountInDec: formatUnits(amountIn, metaIn.decimals),
          amountOutDec: formatUnits(amountOut, metaOut.decimals),
          timestamp: Number(block.timestamp ?? 0n),
        },
        create: {
          chainId,
          txHash: log.transactionHash.toLowerCase(),
          logIndex: log.logIndex,
          blockNumber: current,
          dex: "uniswap-v2",
          pool: log.address.toLowerCase(),
          trader: tx?.from.toLowerCase() ?? null,
          tokenIn,
          tokenOut,
          amountInRaw: amountIn,
          amountOutRaw: amountOut,
          amountInDec: formatUnits(amountIn, metaIn.decimals),
          amountOutDec: formatUnits(amountOut, metaOut.decimals),
          timestamp: Number(block.timestamp ?? 0n),
        },
      });
    }

    for (const log of v3Logs) {
      const decoded = decodeEventLog({ abi: [uniV3SwapEvent], data: log.data, topics: log.topics });
      const poolTokens = await getPoolTokens(client, log.address);
      const tx = txMap.get(log.transactionHash.toLowerCase());

      const amount0 = decoded.args.amount0 as bigint;
      const amount1 = decoded.args.amount1 as bigint;

      let tokenIn = "";
      let tokenOut = "";
      let amountIn = 0n;
      let amountOut = 0n;

      if (amount0 > 0n && amount1 < 0n) {
        tokenIn = poolTokens.token0;
        tokenOut = poolTokens.token1;
        amountIn = amount0;
        amountOut = abs(amount1);
      } else if (amount1 > 0n && amount0 < 0n) {
        tokenIn = poolTokens.token1;
        tokenOut = poolTokens.token0;
        amountIn = amount1;
        amountOut = abs(amount0);
      } else {
        continue;
      }

      const metaIn = await getTokenMeta(client, tokenIn);
      const metaOut = await getTokenMeta(client, tokenOut);

      await prisma.token.upsert({
        where: { chainId_address: { chainId, address: tokenIn } },
        update: { symbol: metaIn.symbol, decimals: metaIn.decimals, name: metaIn.name },
        create: { chainId, address: tokenIn, symbol: metaIn.symbol, decimals: metaIn.decimals, name: metaIn.name },
      });
      await prisma.token.upsert({
        where: { chainId_address: { chainId, address: tokenOut } },
        update: { symbol: metaOut.symbol, decimals: metaOut.decimals, name: metaOut.name },
        create: { chainId, address: tokenOut, symbol: metaOut.symbol, decimals: metaOut.decimals, name: metaOut.name },
      });

      await prisma.swap.upsert({
        where: {
          chainId_txHash_logIndex: {
            chainId,
            txHash: log.transactionHash.toLowerCase(),
            logIndex: log.logIndex,
          },
        },
        update: {
          dex: "uniswap-v3",
          pool: log.address.toLowerCase(),
          trader: tx?.from.toLowerCase() ?? null,
          tokenIn,
          tokenOut,
          amountInRaw: amountIn,
          amountOutRaw: amountOut,
          amountInDec: formatUnits(amountIn, metaIn.decimals),
          amountOutDec: formatUnits(amountOut, metaOut.decimals),
          timestamp: Number(block.timestamp ?? 0n),
        },
        create: {
          chainId,
          txHash: log.transactionHash.toLowerCase(),
          logIndex: log.logIndex,
          blockNumber: current,
          dex: "uniswap-v3",
          pool: log.address.toLowerCase(),
          trader: tx?.from.toLowerCase() ?? null,
          tokenIn,
          tokenOut,
          amountInRaw: amountIn,
          amountOutRaw: amountOut,
          amountInDec: formatUnits(amountIn, metaIn.decimals),
          amountOutDec: formatUnits(amountOut, metaOut.decimals),
          timestamp: Number(block.timestamp ?? 0n),
        },
      });
    }

    if (block.transactions.length === 0) {
      continue;
    }

    for (const tx of block.transactions) {
      if (!tx.to || tx.value === 0n) continue;
      const valueEth = Number(formatEther(tx.value));
      if (valueEth <= 0) continue;
    }
  }
}

export async function getLastProcessedBlock(chainId: number): Promise<bigint> {
  const result = await prisma.block.aggregate({
    where: { chainId },
    _max: { number: true },
  });
  return (result._max.number as bigint) ?? 0n;
}

export async function getChainHead(chainId: number): Promise<bigint> {
  const client = getClient(chainId);
  return client.getBlockNumber();
}
