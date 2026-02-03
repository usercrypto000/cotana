import "dotenv/config";
import { prisma } from "../services/prisma";

const LLAMA_PROTOCOL_URL = "https://api.llama.fi/protocol/";
const LLAMA_CHAINS_URL = "https://api.llama.fi/v2/chains";
const LLAMA_DERIVATIVES_URL = "https://api.llama.fi/summary/derivatives/";

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

const fetchPerpsVolume30d = async (slug: string) => {
  try {
    const data = await fetchJson(`${LLAMA_DERIVATIVES_URL}${slug}`);
    return toNumber(data?.total30d ?? null);
  } catch (err) {
    console.warn(`[defillama] perps fetch failed for ${slug}:`, err);
    return null;
  }
};


const run = async () => {
  const incentives = await prisma.incentive.findMany({
    where: {
      OR: [{ defillamaSlug: { not: null } }, { perpsSlug: { not: null } }],
    },
    select: { id: true, defillamaSlug: true, perpsSlug: true },
  });

  if (incentives.length === 0) {
    console.log("[defillama] no incentives with defillama slug.");
    return;
  }

  const chains = await fetchChains();

  for (const incentive of incentives) {
    const perpsSlug = incentive.perpsSlug?.trim();
    const slug = incentive.defillamaSlug?.trim();
    if (!perpsSlug && !slug) {
      continue;
    }

    let tvlUsd: number | null = null;
    let volumeUsd30d: number | null = null;
    if (perpsSlug) {
      volumeUsd30d = await fetchPerpsVolume30d(perpsSlug);
    } else if (slug) {
      tvlUsd = await fetchTvl(slug, chains);
    }

    await prisma.incentiveMetric.upsert({
      where: { incentiveId: incentive.id },
      update: {
        tvlUsd: perpsSlug ? null : tvlUsd,
        volumeUsd30d: perpsSlug ? volumeUsd30d : null,
      },
      create: {
        incentiveId: incentive.id,
        tvlUsd: perpsSlug ? null : tvlUsd,
        volumeUsd30d: perpsSlug ? volumeUsd30d : null,
      },
    });

    console.log(
      `[defillama] ${perpsSlug ?? slug} -> ${perpsSlug ? "perps30d" : "tvlUsd"}=${perpsSlug ? (volumeUsd30d ?? "n/a") : (tvlUsd ?? "n/a")}`
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
