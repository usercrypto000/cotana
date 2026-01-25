import "dotenv/config";
import { prisma } from "../services/prisma";

const LLAMA_PROTOCOL_URL = "https://api.llama.fi/protocol/";
const LLAMA_CHAINS_URL = "https://api.llama.fi/v2/chains";

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const fetchJson = async (url: string) => {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`request_failed:${res.status}:${url}`);
  }
  return res.json();
};

const fetchChains = async () => {
  try {
    const data = await fetchJson(LLAMA_CHAINS_URL);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn("[defillama] chain list fetch failed:", err);
    return [];
  }
};

const getChainTvl = (chains: any[], slug: string) => {
  const normalized = slug.toLowerCase();
  const match = chains.find((item) => {
    const name = String(item?.name ?? "").toLowerCase();
    const gecko = String(item?.gecko_id ?? "").toLowerCase();
    return name === normalized || gecko === normalized;
  });
  return toNumber(match?.tvl ?? null);
};

const getTvlFromProtocol = (data: any) => {
  if (!data) return null;
  if (Array.isArray(data.tvl)) {
    if (data.tvl.length === 0) {
      return null;
    }
    const last = data.tvl[data.tvl.length - 1];
    return toNumber(last?.totalLiquidityUSD ?? last?.tvl ?? null);
  }
  return toNumber(data?.tvl ?? data?.tvlUsd ?? data?.tvlUSD ?? null);
};

const fetchTvl = async (slug: string, chains: any[]) => {
  try {
    const data = await fetchJson(`${LLAMA_PROTOCOL_URL}${slug}`);
    const tvl = getTvlFromProtocol(data);
    if (tvl !== null) {
      return tvl;
    }
    return getChainTvl(chains, slug);
  } catch (err) {
    console.warn(`[defillama] tvl fetch failed for ${slug}:`, err);
    return getChainTvl(chains, slug);
  }
};


const run = async () => {
  const incentives = await prisma.incentive.findMany({
    where: { defillamaSlug: { not: null } },
    select: { id: true, defillamaSlug: true },
  });

  if (incentives.length === 0) {
    console.log("[defillama] no incentives with defillama slug.");
    return;
  }

  const chains = await fetchChains();

  for (const incentive of incentives) {
    const slug = incentive.defillamaSlug?.trim();
    if (!slug) {
      continue;
    }

    const tvlUsd = await fetchTvl(slug, chains);

    await prisma.incentiveMetric.upsert({
      where: { incentiveId: incentive.id },
      update: { tvlUsd },
      create: { incentiveId: incentive.id, tvlUsd },
    });

    console.log(
      `[defillama] ${slug} -> tvlUsd=${tvlUsd ?? "n/a"}`
    );
  }
};

run()
  .catch((err) => {
    console.error("[defillama] failed", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
