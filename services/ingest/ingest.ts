import {
  createPublicClient,
  decodeEventLog,
  formatEther,
  formatUnits,
  http,
  type PublicClient,
} from "viem";
import { Prisma } from "@prisma/client";
import { prisma } from "@/services/prisma";
import { listChains, resolveRpcUrl } from "@/services/chainConfig";
import { erc20TransferEvent, uniV2SwapEvent, uniV3SwapEvent } from "@/services/ingest/abi";
import { getPairTokens, getPoolTokens, getTokenMeta } from "@/services/ingest/cache";

type RangeInput = {
  chainId: number;
  fromBlock: bigint;
  toBlock: bigint;
};

function sqlBigInt(value: bigint) {
  return Prisma.sql`${value.toString()}::bigint`;
}

function sqlNumeric(value: bigint) {
  return Prisma.sql`${value.toString()}::numeric`;
}

function getStablecoinSet(chainId: number) {
  const chain = listChains().find((item) => item.id === chainId);
  return new Set((chain?.stablecoins ?? []).map((token) => token.toLowerCase()));
}

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
  return value < BigInt(0) ? value * BigInt(-1) : value;
}

export async function ingestRange({ chainId, fromBlock, toBlock }: RangeInput) {
  const client = getClient(chainId);
  const stablecoins = getStablecoinSet(chainId);

  for (let current = fromBlock; current <= toBlock; current += BigInt(1)) {
    const block = await client.getBlock({ blockNumber: current, includeTransactions: true });
    if (!block) continue;

    const existing = await prisma.block.findUnique({
      where: { chainId_number: { chainId, number: current } },
      select: { hash: true },
    });

    if (existing && existing.hash.toLowerCase() !== block.hash.toLowerCase()) {
      await resetBlock(chainId, current);
    }

    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO blocks (chain_id, number, hash, parent_hash, timestamp)
        VALUES (
          ${chainId},
          ${sqlBigInt(current)},
          ${block.hash.toLowerCase()},
          ${block.parentHash.toLowerCase()},
          ${Number(block.timestamp ?? BigInt(0))}
        )
        ON CONFLICT (chain_id, number)
        DO UPDATE SET hash = EXCLUDED.hash, parent_hash = EXCLUDED.parent_hash, timestamp = EXCLUDED.timestamp
      `
    );

    const txMap = new Map<string, (typeof block.transactions)[number]>();
    const txValues = block.transactions.map((tx) => {
      const hash = tx.hash.toLowerCase();
      txMap.set(hash, tx);
      return Prisma.sql`(
        ${chainId},
        ${hash},
        ${sqlBigInt(current)},
        ${tx.from.toLowerCase()},
        ${tx.to ? tx.to.toLowerCase() : null},
        ${sqlNumeric(tx.value ?? BigInt(0))},
        ${null}
      )`;
    });

    if (txValues.length > 0) {
      await prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO transactions (chain_id, hash, block_number, "from", "to", value, status)
          VALUES ${Prisma.join(txValues)}
          ON CONFLICT (chain_id, hash)
          DO UPDATE SET
            block_number = EXCLUDED.block_number,
            "from" = EXCLUDED."from",
            "to" = EXCLUDED."to",
            value = EXCLUDED.value
        `
      );
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

    if (logs.length > 0) {
      const logValues = logs.map((log) => {
        const topics = log.topics.map((topic) => topic.toLowerCase());
        return Prisma.sql`(
          ${chainId},
          ${log.transactionHash.toLowerCase()},
          ${log.logIndex},
          ${sqlBigInt(current)},
          ${log.address.toLowerCase()},
          ${log.topics[0]?.toLowerCase() ?? null},
          ${Prisma.sql`${JSON.stringify(topics)}`}::jsonb,
          ${log.data.toLowerCase()}
        )`;
      });

      await prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO logs (chain_id, tx_hash, log_index, block_number, address, topic0, topics, data)
          VALUES ${Prisma.join(logValues)}
          ON CONFLICT (chain_id, tx_hash, log_index)
          DO UPDATE SET
            block_number = EXCLUDED.block_number,
            address = EXCLUDED.address,
            topic0 = EXCLUDED.topic0,
            topics = EXCLUDED.topics,
            data = EXCLUDED.data
        `
      );
    }

    const tokenMetas = new Map<
      string,
      { symbol: string; decimals: number; name: string; firstSeenBlock: bigint; firstSeenAt: Date }
    >();
    const blockSeenAt = new Date(Number(block.timestamp ?? BigInt(0)) * 1000);
    const transferRows: Array<{
      txHash: string;
      logIndex: number;
      token: string;
      from: string;
      to: string;
      amountRaw: bigint;
      amountDec: string;
    }> = [];

    for (const log of transferLogs) {
      let decoded;
      try {
        decoded = decodeEventLog({ abi: [erc20TransferEvent], data: log.data, topics: log.topics });
      } catch {
        continue;
      }
      const from = (decoded.args.from as string).toLowerCase();
      const to = (decoded.args.to as string).toLowerCase();
      const value = decoded.args.value as bigint;
      const tokenAddress = log.address.toLowerCase();

      let meta = tokenMetas.get(tokenAddress);
      if (!meta) {
        const fetched = await getTokenMeta(client, tokenAddress);
        meta = {
          symbol: fetched.symbol,
          decimals: fetched.decimals,
          name: fetched.name,
          firstSeenBlock: current,
          firstSeenAt: blockSeenAt,
        };
        tokenMetas.set(tokenAddress, meta);
      }

      transferRows.push({
        txHash: log.transactionHash.toLowerCase(),
        logIndex: log.logIndex,
        token: tokenAddress,
        from,
        to,
        amountRaw: value,
        amountDec: formatUnits(value, meta.decimals),
      });
    }

    const swapRows: Array<{
      txHash: string;
      logIndex: number;
      dex: string;
      pool: string;
      trader: string | null;
      tokenIn: string;
      tokenOut: string;
      amountInRaw: bigint;
      amountOutRaw: bigint;
      amountInDec: string;
      amountOutDec: string;
      usdValue: number | null;
      priced: boolean;
    }> = [];

    for (const log of v2Logs) {
      let decoded;
      try {
        decoded = decodeEventLog({ abi: [uniV2SwapEvent], data: log.data, topics: log.topics });
      } catch {
        continue;
      }
      const pairTokens = await getPairTokens(client, log.address);
      const tx = txMap.get(log.transactionHash.toLowerCase());

      const amount0In = decoded.args.amount0In as bigint;
      const amount1In = decoded.args.amount1In as bigint;
      const amount0Out = decoded.args.amount0Out as bigint;
      const amount1Out = decoded.args.amount1Out as bigint;

      let tokenIn = "";
      let tokenOut = "";
      let amountIn = BigInt(0);
      let amountOut = BigInt(0);

      if (amount0In > BigInt(0) && amount1Out > BigInt(0)) {
        tokenIn = pairTokens.token0;
        tokenOut = pairTokens.token1;
        amountIn = amount0In;
        amountOut = amount1Out;
      } else if (amount1In > BigInt(0) && amount0Out > BigInt(0)) {
        tokenIn = pairTokens.token1;
        tokenOut = pairTokens.token0;
        amountIn = amount1In;
        amountOut = amount0Out;
      } else {
        continue;
      }

      let metaIn = tokenMetas.get(tokenIn);
      if (!metaIn) {
        const fetched = await getTokenMeta(client, tokenIn);
        metaIn = {
          symbol: fetched.symbol,
          decimals: fetched.decimals,
          name: fetched.name,
          firstSeenBlock: current,
          firstSeenAt: blockSeenAt,
        };
        tokenMetas.set(tokenIn, metaIn);
      }

      let metaOut = tokenMetas.get(tokenOut);
      if (!metaOut) {
        const fetched = await getTokenMeta(client, tokenOut);
        metaOut = {
          symbol: fetched.symbol,
          decimals: fetched.decimals,
          name: fetched.name,
          firstSeenBlock: current,
          firstSeenAt: blockSeenAt,
        };
        tokenMetas.set(tokenOut, metaOut);
      }

      const tokenInStable = stablecoins.has(tokenIn);
      const tokenOutStable = stablecoins.has(tokenOut);
      let usdValue: number | null = null;
      let priced = false;

      if (tokenInStable) {
        usdValue = Number.parseFloat(formatUnits(amountIn, metaIn.decimals));
        priced = Number.isFinite(usdValue) && usdValue > 0;
      } else if (tokenOutStable) {
        usdValue = Number.parseFloat(formatUnits(amountOut, metaOut.decimals));
        priced = Number.isFinite(usdValue) && usdValue > 0;
      }

      swapRows.push({
        txHash: log.transactionHash.toLowerCase(),
        logIndex: log.logIndex,
        dex: "uniswap-v2",
        pool: log.address.toLowerCase(),
        trader: tx?.from.toLowerCase() ?? null,
        tokenIn,
        tokenOut,
        amountInRaw: amountIn,
        amountOutRaw: amountOut,
        amountInDec: formatUnits(amountIn, metaIn.decimals),
        amountOutDec: formatUnits(amountOut, metaOut.decimals),
        usdValue: priced ? usdValue : null,
        priced,
      });
    }

    for (const log of v3Logs) {
      let decoded;
      try {
        decoded = decodeEventLog({ abi: [uniV3SwapEvent], data: log.data, topics: log.topics });
      } catch {
        continue;
      }
      const poolTokens = await getPoolTokens(client, log.address);
      const tx = txMap.get(log.transactionHash.toLowerCase());

      const amount0 = decoded.args.amount0 as bigint;
      const amount1 = decoded.args.amount1 as bigint;

      let tokenIn = "";
      let tokenOut = "";
      let amountIn = BigInt(0);
      let amountOut = BigInt(0);

      if (amount0 > BigInt(0) && amount1 < BigInt(0)) {
        tokenIn = poolTokens.token0;
        tokenOut = poolTokens.token1;
        amountIn = amount0;
        amountOut = abs(amount1);
      } else if (amount1 > BigInt(0) && amount0 < BigInt(0)) {
        tokenIn = poolTokens.token1;
        tokenOut = poolTokens.token0;
        amountIn = amount1;
        amountOut = abs(amount0);
      } else {
        continue;
      }

      let metaIn = tokenMetas.get(tokenIn);
      if (!metaIn) {
        const fetched = await getTokenMeta(client, tokenIn);
        metaIn = {
          symbol: fetched.symbol,
          decimals: fetched.decimals,
          name: fetched.name,
          firstSeenBlock: current,
          firstSeenAt: blockSeenAt,
        };
        tokenMetas.set(tokenIn, metaIn);
      }

      let metaOut = tokenMetas.get(tokenOut);
      if (!metaOut) {
        const fetched = await getTokenMeta(client, tokenOut);
        metaOut = {
          symbol: fetched.symbol,
          decimals: fetched.decimals,
          name: fetched.name,
          firstSeenBlock: current,
          firstSeenAt: blockSeenAt,
        };
        tokenMetas.set(tokenOut, metaOut);
      }

      const tokenInStable = stablecoins.has(tokenIn);
      const tokenOutStable = stablecoins.has(tokenOut);
      let usdValue: number | null = null;
      let priced = false;

      if (tokenInStable) {
        usdValue = Number.parseFloat(formatUnits(amountIn, metaIn.decimals));
        priced = Number.isFinite(usdValue) && usdValue > 0;
      } else if (tokenOutStable) {
        usdValue = Number.parseFloat(formatUnits(amountOut, metaOut.decimals));
        priced = Number.isFinite(usdValue) && usdValue > 0;
      }

      swapRows.push({
        txHash: log.transactionHash.toLowerCase(),
        logIndex: log.logIndex,
        dex: "uniswap-v3",
        pool: log.address.toLowerCase(),
        trader: tx?.from.toLowerCase() ?? null,
        tokenIn,
        tokenOut,
        amountInRaw: amountIn,
        amountOutRaw: amountOut,
        amountInDec: formatUnits(amountIn, metaIn.decimals),
        amountOutDec: formatUnits(amountOut, metaOut.decimals),
        usdValue: priced ? usdValue : null,
        priced,
      });
    }

    if (tokenMetas.size > 0) {
      const tokenValues = Array.from(tokenMetas.entries()).map(([address, meta]) =>
        Prisma.sql`(
          ${chainId},
          ${address},
          ${meta.symbol},
          ${meta.decimals},
          ${meta.name},
          ${sqlBigInt(meta.firstSeenBlock)},
          ${meta.firstSeenAt},
          ${false}
        )`
      );

      await prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO tokens (
            chain_id,
            address,
            symbol,
            decimals,
            name,
            first_seen_block,
            first_seen_at,
            verified
          )
          VALUES ${Prisma.join(tokenValues)}
          ON CONFLICT (chain_id, address)
          DO UPDATE SET
            symbol = EXCLUDED.symbol,
            decimals = EXCLUDED.decimals,
            name = EXCLUDED.name,
            first_seen_block = COALESCE(tokens.first_seen_block, EXCLUDED.first_seen_block),
            first_seen_at = COALESCE(tokens.first_seen_at, EXCLUDED.first_seen_at)
        `
      );
    }

    if (transferRows.length > 0) {
      const transferValues = transferRows.map((transfer) =>
        Prisma.sql`(
          ${chainId},
          ${transfer.txHash},
          ${transfer.logIndex},
          ${sqlBigInt(current)},
          ${transfer.token},
          ${transfer.from},
          ${transfer.to},
          ${sqlNumeric(transfer.amountRaw)},
          ${transfer.amountDec},
          ${Number(block.timestamp ?? BigInt(0))}
        )`
      );

      await prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO token_transfers (
            chain_id,
            tx_hash,
            log_index,
            block_number,
            token,
            "from",
            "to",
            amount_raw,
            amount_dec,
            timestamp
          )
          VALUES ${Prisma.join(transferValues)}
          ON CONFLICT (chain_id, tx_hash, log_index)
          DO UPDATE SET
            token = EXCLUDED.token,
            "from" = EXCLUDED."from",
            "to" = EXCLUDED."to",
            amount_raw = EXCLUDED.amount_raw,
            amount_dec = EXCLUDED.amount_dec,
            timestamp = EXCLUDED.timestamp
        `
      );
    }

    if (swapRows.length > 0) {
      const swapValues = swapRows.map((swap) =>
        Prisma.sql`(
          ${chainId},
          ${swap.txHash},
          ${swap.logIndex},
          ${sqlBigInt(current)},
          ${swap.dex},
          ${swap.pool},
          ${swap.trader},
          ${swap.tokenIn},
          ${swap.tokenOut},
          ${sqlNumeric(swap.amountInRaw)},
          ${sqlNumeric(swap.amountOutRaw)},
          ${swap.amountInDec},
          ${swap.amountOutDec},
          ${swap.usdValue ?? null},
          ${swap.priced},
          ${Number(block.timestamp ?? BigInt(0))}
        )`
      );

      await prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO swaps (
            chain_id,
            tx_hash,
            log_index,
            block_number,
            dex,
            pool,
            trader,
            token_in,
            token_out,
            amount_in_raw,
            amount_out_raw,
            amount_in_dec,
            amount_out_dec,
            usd_value,
            priced,
            timestamp
          )
          VALUES ${Prisma.join(swapValues)}
          ON CONFLICT (chain_id, tx_hash, log_index)
          DO UPDATE SET
            dex = EXCLUDED.dex,
            pool = EXCLUDED.pool,
            trader = EXCLUDED.trader,
            token_in = EXCLUDED.token_in,
            token_out = EXCLUDED.token_out,
            amount_in_raw = EXCLUDED.amount_in_raw,
            amount_out_raw = EXCLUDED.amount_out_raw,
            amount_in_dec = EXCLUDED.amount_in_dec,
            amount_out_dec = EXCLUDED.amount_out_dec,
            usd_value = EXCLUDED.usd_value,
            priced = EXCLUDED.priced,
            timestamp = EXCLUDED.timestamp
        `
      );
    }

    if (block.transactions.length === 0) {
      continue;
    }

    for (const tx of block.transactions) {
      if (!tx.to || tx.value === BigInt(0)) continue;
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
  return (result._max.number as bigint) ?? BigInt(0);
}

export async function getChainHead(chainId: number): Promise<bigint> {
  const client = getClient(chainId);
  return client.getBlockNumber();
}
