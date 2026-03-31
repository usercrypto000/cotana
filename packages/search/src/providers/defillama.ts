import type { CategorySignalMap } from "@cotana/types";

type SignalRefreshApp = {
  id: string;
  slug: string;
  name: string;
};

type ProtocolRecord = Record<string, unknown>;
type YieldPoolRecord = Record<string, unknown>;

export type ProviderSignalResult = {
  appId: string;
  signals: CategorySignalMap;
  source: "defillama";
};

const DEFILLAMA_PROTOCOLS_URL = "https://api.llama.fi/protocols";
const DEFILLAMA_YIELDS_URL = "https://yields.llama.fi/pools";

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function matchesApp(app: SignalRefreshApp, candidate: unknown) {
  if (typeof candidate !== "string" || candidate.length === 0) {
    return false;
  }

  const normalizedAppNames = [app.slug, app.name].map(normalizeName);
  const normalizedCandidate = normalizeName(candidate);

  return normalizedAppNames.some(
    (name) =>
      name === normalizedCandidate ||
      name.includes(normalizedCandidate) ||
      normalizedCandidate.includes(name),
  );
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchDefiSignals(apps: SignalRefreshApp[]): Promise<ProviderSignalResult[]> {
  const protocols = (await fetchJson<ProtocolRecord[]>(DEFILLAMA_PROTOCOLS_URL)) ?? [];

  return apps.map<ProviderSignalResult>((app) => {
    const protocol = protocols.find((item) => matchesApp(app, item.slug) || matchesApp(app, item.name));
    const tvl = protocol ? toNumber(protocol.tvl ?? protocol.currentChainTvls ?? null) : null;
    const volume =
      protocol &&
      toNumber(
        protocol.volume24h ??
          protocol.dailyVolume ??
          protocol.total24h ??
          protocol.totalVolume24h ??
          null,
      );

    return {
      appId: app.id,
      signals: {
        ...(typeof tvl === "number" ? { tvl } : {}),
        ...(typeof volume === "number" ? { volume } : {}),
        ...(typeof tvl === "number" ? { liquidity_depth: tvl * 0.03 } : {})
      },
      source: "defillama"
    };
  });
}

export async function fetchLendingYieldSignals(apps: SignalRefreshApp[]): Promise<ProviderSignalResult[]> {
  const response = (await fetchJson<{ data?: YieldPoolRecord[] }>(DEFILLAMA_YIELDS_URL)) ?? {};
  const pools = response.data ?? [];

  return apps.map<ProviderSignalResult>((app) => {
    const matchingPools = pools.filter((pool) => matchesApp(app, pool.project) || matchesApp(app, pool.symbol));
    const apyValues = matchingPools.map((pool) => toNumber(pool.apy)).filter((value): value is number => typeof value === "number");
    const tvlValues = matchingPools.map((pool) => toNumber(pool.tvlUsd)).filter((value): value is number => typeof value === "number");
    const supportedAssets = new Set(
      matchingPools
        .map((pool) => (typeof pool.symbol === "string" ? pool.symbol.trim() : ""))
        .filter(Boolean),
    );

    return {
      appId: app.id,
      signals: {
        ...(apyValues.length > 0 ? { apy: Math.max(...apyValues) } : {}),
        ...(tvlValues.length > 0 ? { tvl: tvlValues.reduce((sum, value) => sum + value, 0) } : {}),
        ...(supportedAssets.size > 0 ? { supported_asset_count: supportedAssets.size } : {})
      },
      source: "defillama"
    };
  });
}
