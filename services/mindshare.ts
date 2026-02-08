import { Prisma } from "@prisma/client";
import { prisma } from "@/services/prisma";
import { listChains } from "@/services/chainConfig";

export type MindshareWindow = "24h" | "7d" | "30d";

export type MindshareProtocolSummary = {
  id: string;
  name: string;
  chain: string;
  category: string;
  uaw: number;
  visits: number;
  change: number;
  speed: "fast" | "slow";
  momentum: number;
  spark: number[];
};

export type MindshareWalletSummary = {
  id: string;
  label: string;
  change: number;
  interactions: number;
  breadth: number;
  intensity: "High" | "Medium" | "Low";
  score: number;
  protocols: string[];
};

export type MindshareSummary = {
  window: MindshareWindow;
  rangeLabel: string;
  totals: {
    uaw: number;
    visits: number;
    protocols: number;
    coverage: number;
  };
  protocols: MindshareProtocolSummary[];
  wallets: MindshareWalletSummary[];
};

export type MindshareProtocolDetail = {
  id: string;
  name: string;
  category: string;
  chain: string;
  window: MindshareWindow;
  rangeLabel: string;
  uaw: number;
  visits: number;
  interactions: number;
  contracts: number;
  chains: number;
  change: number;
  momentum: number;
  spark: number[];
  lastSeen: number | null;
  topWallets: Array<{ address: string; label: string; interactions: number }>;
};

export type MindshareWalletDetail = {
  id: string;
  label: string;
  window: MindshareWindow;
  rangeLabel: string;
  interactions: number;
  breadth: number;
  contracts: number;
  chains: number;
  change: number;
  momentum: number;
  score: number;
  intensity: "High" | "Medium" | "Low";
  spark: number[];
  lastSeen: number | null;
  protocols: Array<{ id: string; name: string; interactions: number }>;
};

const WINDOW_SECONDS: Record<MindshareWindow, number> = {
  "24h": 24 * 60 * 60,
  "7d": 7 * 24 * 60 * 60,
  "30d": 30 * 24 * 60 * 60,
};

const WINDOW_LABELS: Record<MindshareWindow, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

const BUCKETS = 9;

const ALLOWED_CHAIN_IDS = [1, 8453, 42161, 137];
const EXCLUDED_LABEL_CATEGORIES = [
  "cex",
  "bridge",
  "router",
  "market-maker",
  "mev",
  "treasury",
  "fund",
];

const MIN_INTERACTIONS = Number(process.env.MINDSHARE_MIN_INTERACTIONS ?? "2");
const MIN_PROTOCOLS = Number(process.env.MINDSHARE_MIN_PROTOCOLS ?? "2");
const MAX_PER_MINUTE = Number(process.env.MINDSHARE_MAX_PER_MINUTE ?? "5");

function shortAddress(address: string) {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function isMindshareEnabled() {
  return process.env.ENABLE_MINDSHARE_ARENA === "true" || process.env.NODE_ENV !== "production";
}

export function resolveMindshareWindow(value?: string | null): MindshareWindow {
  if (value === "7d" || value === "30d" || value === "24h") return value;
  return "24h";
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number.parseFloat(value);
  return 0;
}

function getRange(window: MindshareWindow) {
  const now = Math.floor(Date.now() / 1000);
  const windowSeconds = WINDOW_SECONDS[window];
  const from = now - windowSeconds;
  const prevFrom = from - windowSeconds;
  return {
    now,
    from,
    prevFrom,
    label: WINDOW_LABELS[window],
    windowSeconds,
  };
}

function computeScore(uaw: number, visits: number) {
  return uaw * 0.7 + visits * 0.3;
}

function computeChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function computeMomentum(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 1.5 : 1;
  return current / previous;
}

function classifySpeed(change: number) {
  return Math.abs(change) >= 25 ? "fast" : "slow";
}

function intensityLabel(interactions: number): "High" | "Medium" | "Low" {
  if (interactions >= 80) return "High";
  if (interactions >= 30) return "Medium";
  return "Low";
}

function scoreWallet(breadth: number, interactions: number) {
  const score = breadth * 12 + Math.log10(interactions + 1) * 25;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildChainMap() {
  const map = new Map<number, string>();
  for (const chain of listChains()) {
    map.set(chain.id, chain.name);
  }
  map.set(137, "Polygon");
  return map;
}

function interactionCte(range: { now: number; from: number }) {
  const chainIds = Prisma.join(ALLOWED_CHAIN_IDS);
  const categories = Prisma.join(EXCLUDED_LABEL_CATEGORIES);

  return Prisma.sql`
    WITH protocol_contracts AS (
      SELECT protocol_id, chain_id, address
      FROM mindshare_protocol_contracts
      WHERE chain_id IN (${chainIds})
        AND (active_from IS NULL OR active_from <= to_timestamp(${range.now}))
        AND (active_to IS NULL OR active_to >= to_timestamp(${range.from}))
    ),
    tx_hits AS (
      SELECT pc.protocol_id,
             t.chain_id,
             t.hash AS tx_hash,
             t."from" AS wallet,
             b.timestamp
      FROM transactions t
      JOIN blocks b
        ON b.chain_id = t.chain_id
       AND b.number = t.block_number
      JOIN mindshare_protocol_contracts pc
        ON pc.chain_id = t.chain_id
       AND pc.address = t."to"
      WHERE b.timestamp >= ${range.from}
        AND b.timestamp < ${range.now}
    ),
    dedup AS (
      SELECT DISTINCT protocol_id, chain_id, tx_hash, wallet, timestamp
      FROM tx_hits
      WHERE wallet IS NOT NULL
    ),
    wallet_minute AS (
      SELECT wallet, FLOOR(timestamp / 60)::int AS minute, COUNT(*) AS cnt
      FROM dedup
      GROUP BY wallet, minute
    ),
    wallet_rates AS (
      SELECT wallet, MAX(cnt) AS max_per_min
      FROM wallet_minute
      GROUP BY wallet
    ),
    wallet_totals AS (
      SELECT wallet, COUNT(*) AS interactions, COUNT(DISTINCT protocol_id) AS protocols
      FROM dedup
      GROUP BY wallet
    ),
    excluded_wallets AS (
      SELECT DISTINCT al.address
      FROM address_labels al
      JOIN labels l ON l.id = al.label_id
      WHERE al.chain_id IN (${chainIds})
        AND l.category IN (${categories})
    ),
    eligible_wallets AS (
      SELECT wt.wallet
      FROM wallet_totals wt
      JOIN wallet_rates wr ON wr.wallet = wt.wallet
      WHERE wt.interactions >= ${MIN_INTERACTIONS}
        AND wt.protocols >= ${MIN_PROTOCOLS}
        AND wr.max_per_min <= ${MAX_PER_MINUTE}
        AND wt.wallet NOT IN (SELECT address FROM excluded_wallets)
    ),
    filtered AS (
      SELECT d.*
      FROM dedup d
      JOIN eligible_wallets ew ON ew.wallet = d.wallet
    )
  `;
}

export async function getMindshareSummary(window: MindshareWindow): Promise<MindshareSummary> {
  const range = getRange(window);
  const bucketSize = Math.max(1, Math.floor(range.windowSeconds / BUCKETS));

  const protocolRows = await prisma.$queryRaw<
    Array<{ id: string; name: string; category: string | null; uaw: bigint; visits: bigint }>
  >(
    Prisma.sql`
      ${interactionCte(range)}
      SELECT p.slug AS id,
             p.name,
             p.category,
             COUNT(DISTINCT f.wallet) AS uaw,
             COUNT(DISTINCT f.tx_hash) AS visits
      FROM filtered f
      JOIN mindshare_protocols p ON p.id = f.protocol_id
      GROUP BY p.slug, p.name, p.category
    `
  );

  const prevRows = await prisma.$queryRaw<
    Array<{ id: string; uaw: bigint; visits: bigint }>
  >(
    Prisma.sql`
      ${interactionCte({ now: range.from, from: range.prevFrom })}
      SELECT p.slug AS id,
             COUNT(DISTINCT f.wallet) AS uaw,
             COUNT(DISTINCT f.tx_hash) AS visits
      FROM filtered f
      JOIN mindshare_protocols p ON p.id = f.protocol_id
      GROUP BY p.slug
    `
  );

  const chainRows = await prisma.$queryRaw<
    Array<{ id: string; chain_id: number; interactions: bigint }>
  >(
    Prisma.sql`
      ${interactionCte(range)}
      SELECT p.slug AS id,
             f.chain_id,
             COUNT(*) AS interactions
      FROM filtered f
      JOIN mindshare_protocols p ON p.id = f.protocol_id
      GROUP BY p.slug, f.chain_id
    `
  );

  const bucketRows = await prisma.$queryRaw<
    Array<{ id: string; bucket: number; interactions: bigint }>
  >(
    Prisma.sql`
      ${interactionCte(range)}
      SELECT p.slug AS id,
             FLOOR((f.timestamp - ${range.from}) / ${bucketSize})::int AS bucket,
             COUNT(*) AS interactions
      FROM filtered f
      JOIN mindshare_protocols p ON p.id = f.protocol_id
      GROUP BY p.slug, bucket
    `
  );

  const totalsRow = await prisma.$queryRaw<
    Array<{ uaw: bigint; visits: bigint; coverage: bigint }>
  >(
    Prisma.sql`
      ${interactionCte(range)}
      SELECT COUNT(DISTINCT f.wallet) AS uaw,
             COUNT(DISTINCT f.tx_hash) AS visits,
             COUNT(DISTINCT f.chain_id) AS coverage
      FROM filtered f
    `
  );

  const chainMap = buildChainMap();
  const prevMap = new Map<string, { uaw: number; visits: number }>();
  for (const row of prevRows) {
    prevMap.set(row.id, { uaw: toNumber(row.uaw), visits: toNumber(row.visits) });
  }

  const chainInfo = new Map<string, { chains: Set<number>; topChainId: number; topCount: number }>();
  for (const row of chainRows) {
    const count = toNumber(row.interactions);
    const entry = chainInfo.get(row.id) ?? {
      chains: new Set<number>(),
      topChainId: row.chain_id,
      topCount: count,
    };
    entry.chains.add(row.chain_id);
    if (count > entry.topCount) {
      entry.topCount = count;
      entry.topChainId = row.chain_id;
    }
    chainInfo.set(row.id, entry);
  }

  const bucketMap = new Map<string, Array<{ bucket: number; interactions: number }>>();
  for (const row of bucketRows) {
    const list = bucketMap.get(row.id) ?? [];
    list.push({ bucket: row.bucket, interactions: toNumber(row.interactions) });
    bucketMap.set(row.id, list);
  }

  const protocols: MindshareProtocolSummary[] = protocolRows.map((row) => {
    const uaw = toNumber(row.uaw);
    const visits = toNumber(row.visits);
    const prev = prevMap.get(row.id) ?? { uaw: 0, visits: 0 };
    const score = computeScore(uaw, visits);
    const prevScore = computeScore(prev.uaw, prev.visits);
    const change = computeChange(score, prevScore);
    const momentum = computeMomentum(score, prevScore);
    const speed = classifySpeed(change);

    const chainEntry = chainInfo.get(row.id);
    let chain = "Unknown";
    if (chainEntry) {
      chain =
        chainEntry.chains.size > 1
          ? "Multi-chain"
          : chainMap.get(chainEntry.topChainId) ?? `Chain ${chainEntry.topChainId}`;
    }

    const spark = Array.from({ length: BUCKETS }, () => 0);
    for (const item of bucketMap.get(row.id) ?? []) {
      if (item.bucket >= 0 && item.bucket < BUCKETS) {
        spark[item.bucket] = item.interactions;
      }
    }

    return {
      id: row.id,
      name: row.name,
      chain,
      category: row.category ?? "Protocol",
      uaw,
      visits,
      change,
      speed,
      momentum,
      spark,
    };
  });

  protocols.sort((a, b) => computeScore(b.uaw, b.visits) - computeScore(a.uaw, a.visits));

  const walletRows = await prisma.$queryRaw<
    Array<{ wallet: string; interactions: bigint; breadth: bigint }>
  >(
    Prisma.sql`
      ${interactionCte(range)}
      SELECT f.wallet,
             COUNT(*) AS interactions,
             COUNT(DISTINCT f.protocol_id) AS breadth
      FROM filtered f
      GROUP BY f.wallet
      ORDER BY breadth DESC, interactions DESC
      LIMIT 8
    `
  );

  const walletIds = walletRows.map((row) => row.wallet);
  let prevWalletRows: Array<{ wallet: string; interactions: bigint }> = [];
  let protocolRowsByWallet: Array<{ wallet: string; name: string; interactions: bigint }> = [];

  if (walletIds.length > 0) {
    prevWalletRows = await prisma.$queryRaw(
      Prisma.sql`
        ${interactionCte({ now: range.from, from: range.prevFrom })}
        SELECT f.wallet, COUNT(*) AS interactions
        FROM filtered f
        WHERE f.wallet IN (${Prisma.join(walletIds)})
        GROUP BY f.wallet
      `
    );

    protocolRowsByWallet = await prisma.$queryRaw(
      Prisma.sql`
        ${interactionCte(range)}
        SELECT f.wallet, p.name, COUNT(*) AS interactions
        FROM filtered f
        JOIN mindshare_protocols p ON p.id = f.protocol_id
        WHERE f.wallet IN (${Prisma.join(walletIds)})
        GROUP BY f.wallet, p.name
        ORDER BY interactions DESC
      `
    );
  }

  const prevWalletMap = new Map<string, number>();
  for (const row of prevWalletRows) {
    prevWalletMap.set(row.wallet, toNumber(row.interactions));
  }

  const walletProtocolsMap = new Map<string, Array<{ name: string; interactions: number }>>();
  for (const row of protocolRowsByWallet) {
    const list = walletProtocolsMap.get(row.wallet) ?? [];
    list.push({ name: row.name, interactions: toNumber(row.interactions) });
    walletProtocolsMap.set(row.wallet, list);
  }

  const wallets: MindshareWalletSummary[] = walletRows.map((row) => {
    const interactions = toNumber(row.interactions);
    const breadth = toNumber(row.breadth);
    const prevInteractions = prevWalletMap.get(row.wallet) ?? 0;
    const change = computeChange(interactions, prevInteractions);
    const protocolsList = (walletProtocolsMap.get(row.wallet) ?? [])
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, 4)
      .map((item) => item.name);

    return {
      id: row.wallet,
      label: shortAddress(row.wallet),
      change,
      interactions,
      breadth,
      intensity: intensityLabel(interactions),
      score: scoreWallet(breadth, interactions),
      protocols: protocolsList,
    };
  });

  const totals = totalsRow[0] ?? { uaw: BigInt(0), visits: BigInt(0), coverage: BigInt(0) };

  return {
    window,
    rangeLabel: range.label,
    totals: {
      uaw: toNumber(totals.uaw),
      visits: toNumber(totals.visits),
      protocols: protocols.length,
      coverage: toNumber(totals.coverage),
    },
    protocols,
    wallets,
  };
}

export async function getProtocolDetail(
  slug: string,
  window: MindshareWindow
): Promise<MindshareProtocolDetail | null> {
  const protocol = await prisma.mindshareProtocol.findUnique({ where: { slug } });
  if (!protocol) return null;

  const range = getRange(window);
  const bucketSize = Math.max(1, Math.floor(range.windowSeconds / BUCKETS));

  const current = await prisma.$queryRaw<
    Array<{ uaw: bigint; visits: bigint; interactions: bigint; contracts: bigint; chains: bigint; last_seen: bigint | null }>
  >(
    Prisma.sql`
      ${interactionCte(range)}
      SELECT COUNT(DISTINCT f.wallet) AS uaw,
             COUNT(DISTINCT f.tx_hash) AS visits,
             COUNT(*) AS interactions,
             COUNT(DISTINCT f.chain_id) AS chains,
             COUNT(DISTINCT c.address) AS contracts,
             MAX(f.timestamp) AS last_seen
      FROM filtered f
      JOIN mindshare_protocol_contracts c ON c.protocol_id = ${protocol.id}
      WHERE f.protocol_id = ${protocol.id}
    `
  );

  if (!current[0]) {
    return null;
  }

  const previous = await prisma.$queryRaw<
    Array<{ uaw: bigint; visits: bigint }>
  >(
    Prisma.sql`
      ${interactionCte({ now: range.from, from: range.prevFrom })}
      SELECT COUNT(DISTINCT f.wallet) AS uaw,
             COUNT(DISTINCT f.tx_hash) AS visits
      FROM filtered f
      WHERE f.protocol_id = ${protocol.id}
    `
  );

  const sparkRows = await prisma.$queryRaw<
    Array<{ bucket: number; interactions: bigint }>
  >(
    Prisma.sql`
      ${interactionCte(range)}
      SELECT FLOOR((f.timestamp - ${range.from}) / ${bucketSize})::int AS bucket,
             COUNT(*) AS interactions
      FROM filtered f
      WHERE f.protocol_id = ${protocol.id}
      GROUP BY bucket
    `
  );

  const wallets = await prisma.$queryRaw<
    Array<{ wallet: string; interactions: bigint }>
  >(
    Prisma.sql`
      ${interactionCte(range)}
      SELECT f.wallet, COUNT(*) AS interactions
      FROM filtered f
      WHERE f.protocol_id = ${protocol.id}
      GROUP BY f.wallet
      ORDER BY interactions DESC
      LIMIT 10
    `
  );

  const chainMap = buildChainMap();
  const chainRows = await prisma.$queryRaw<
    Array<{ chain_id: number; interactions: bigint }>
  >(
    Prisma.sql`
      ${interactionCte(range)}
      SELECT f.chain_id, COUNT(*) AS interactions
      FROM filtered f
      WHERE f.protocol_id = ${protocol.id}
      GROUP BY f.chain_id
    `
  );

  let chainLabel = "Unknown";
  if (chainRows.length > 0) {
    const chains = new Set(chainRows.map((row) => row.chain_id));
    if (chains.size > 1) {
      chainLabel = "Multi-chain";
    } else {
      const id = chainRows[0]?.chain_id ?? 0;
      chainLabel = chainMap.get(id) ?? `Chain ${id}`;
    }
  }

  const currentRow = current[0];
  const prevRow = previous[0] ?? { uaw: BigInt(0), visits: BigInt(0) };
  const uaw = toNumber(currentRow.uaw);
  const visits = toNumber(currentRow.visits);
  const prevScore = computeScore(toNumber(prevRow.uaw), toNumber(prevRow.visits));
  const score = computeScore(uaw, visits);

  const spark = Array.from({ length: BUCKETS }, () => 0);
  for (const row of sparkRows) {
    if (row.bucket >= 0 && row.bucket < BUCKETS) {
      spark[row.bucket] = toNumber(row.interactions);
    }
  }

  return {
    id: protocol.slug,
    name: protocol.name,
    category: protocol.category ?? "Protocol",
    chain: chainLabel,
    window,
    rangeLabel: range.label,
    uaw,
    visits,
    interactions: toNumber(currentRow.interactions),
    contracts: toNumber(currentRow.contracts),
    chains: toNumber(currentRow.chains),
    change: computeChange(score, prevScore),
    momentum: computeMomentum(score, prevScore),
    spark,
    lastSeen: currentRow.last_seen ? toNumber(currentRow.last_seen) : null,
    topWallets: wallets.map((row) => ({
      address: row.wallet,
      label: shortAddress(row.wallet),
      interactions: toNumber(row.interactions),
    })),
  };
}

export async function getWalletDetail(
  wallet: string,
  window: MindshareWindow
): Promise<MindshareWalletDetail | null> {
  const range = getRange(window);
  const bucketSize = Math.max(1, Math.floor(range.windowSeconds / BUCKETS));
  const normalized = wallet.toLowerCase();

  const current = await prisma.$queryRaw<
    Array<{ interactions: bigint; breadth: bigint; contracts: bigint; chains: bigint; last_seen: bigint | null }>
  >(
    Prisma.sql`
      ${interactionCte(range)}
      SELECT COUNT(*) AS interactions,
             COUNT(DISTINCT f.protocol_id) AS breadth,
             COUNT(DISTINCT c.address) AS contracts,
             COUNT(DISTINCT f.chain_id) AS chains,
             MAX(f.timestamp) AS last_seen
      FROM filtered f
      JOIN mindshare_protocol_contracts c ON c.protocol_id = f.protocol_id
      WHERE f.wallet = ${normalized}
    `
  );

  if (!current[0]) {
    return null;
  }

  const prev = await prisma.$queryRaw<
    Array<{ interactions: bigint }>
  >(
    Prisma.sql`
      ${interactionCte({ now: range.from, from: range.prevFrom })}
      SELECT COUNT(*) AS interactions
      FROM filtered f
      WHERE f.wallet = ${normalized}
    `
  );

  const sparkRows = await prisma.$queryRaw<
    Array<{ bucket: number; interactions: bigint }>
  >(
    Prisma.sql`
      ${interactionCte(range)}
      SELECT FLOOR((f.timestamp - ${range.from}) / ${bucketSize})::int AS bucket,
             COUNT(*) AS interactions
      FROM filtered f
      WHERE f.wallet = ${normalized}
      GROUP BY bucket
    `
  );

  const protocolRows = await prisma.$queryRaw<
    Array<{ id: string; name: string; interactions: bigint }>
  >(
    Prisma.sql`
      ${interactionCte(range)}
      SELECT p.slug AS id,
             p.name,
             COUNT(*) AS interactions
      FROM filtered f
      JOIN mindshare_protocols p ON p.id = f.protocol_id
      WHERE f.wallet = ${normalized}
      GROUP BY p.slug, p.name
      ORDER BY interactions DESC
      LIMIT 12
    `
  );

  const spark = Array.from({ length: BUCKETS }, () => 0);
  for (const row of sparkRows) {
    if (row.bucket >= 0 && row.bucket < BUCKETS) {
      spark[row.bucket] = toNumber(row.interactions);
    }
  }

  const currentRow = current[0];
  const interactions = toNumber(currentRow.interactions);
  const breadth = toNumber(currentRow.breadth);
  const prevInteractions = toNumber(prev[0]?.interactions ?? 0);

  return {
    id: normalized,
    label: shortAddress(normalized),
    window,
    rangeLabel: range.label,
    interactions,
    breadth,
    contracts: toNumber(currentRow.contracts),
    chains: toNumber(currentRow.chains),
    change: computeChange(interactions, prevInteractions),
    momentum: computeMomentum(interactions, prevInteractions),
    score: scoreWallet(breadth, interactions),
    intensity: intensityLabel(interactions),
    spark,
    lastSeen: currentRow.last_seen ? toNumber(currentRow.last_seen) : null,
    protocols: protocolRows.map((row) => ({
      id: row.id,
      name: row.name,
      interactions: toNumber(row.interactions),
    })),
  };
}

