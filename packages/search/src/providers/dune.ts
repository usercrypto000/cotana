import type { CategorySignalMap } from "@cotana/types";

type SignalRefreshApp = {
  id: string;
  slug: string;
  name: string;
};

type DuneCategory = "defi" | "lending-yield" | "prediction-markets";

export type DuneSignalResult = {
  appId: string;
  signals: CategorySignalMap;
  source: "dune";
};

const DUNE_QUERY_ID_BY_CATEGORY: Record<DuneCategory, string | undefined> = {
  defi: process.env.DUNE_DEFI_QUERY_ID,
  "lending-yield": process.env.DUNE_LENDING_YIELD_QUERY_ID,
  "prediction-markets": process.env.DUNE_PREDICTION_MARKETS_QUERY_ID
};

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

function matchApp(apps: SignalRefreshApp[], candidate: unknown) {
  if (typeof candidate !== "string" || candidate.length === 0) {
    return null;
  }

  const normalizedCandidate = normalizeName(candidate);

  return (
    apps.find((app) => {
      const normalizedSlug = normalizeName(app.slug);
      const normalizedName = normalizeName(app.name);

      return (
        normalizedSlug === normalizedCandidate ||
        normalizedName === normalizedCandidate ||
        normalizedSlug.includes(normalizedCandidate) ||
        normalizedName.includes(normalizedCandidate) ||
        normalizedCandidate.includes(normalizedSlug) ||
        normalizedCandidate.includes(normalizedName)
      );
    }) ?? null
  );
}

export async function fetchDuneSignals(
  category: DuneCategory,
  apps: SignalRefreshApp[],
): Promise<DuneSignalResult[]> {
  const apiKey = process.env.DUNE_API_KEY;
  const queryId = DUNE_QUERY_ID_BY_CATEGORY[category];

  if (!apiKey || !queryId) {
    return [];
  }

  try {
    const response = await fetch(`https://api.dune.com/api/v1/query/${queryId}/results`, {
      headers: {
        Accept: "application/json",
        "X-Dune-API-Key": apiKey
      }
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as {
      result?: {
        rows?: Array<Record<string, unknown>>;
      };
    };
    const rows = payload.result?.rows ?? [];
    const results: DuneSignalResult[] = [];

    for (const row of rows) {
      const app =
        matchApp(apps, row.app_slug) ??
        matchApp(apps, row.slug) ??
        matchApp(apps, row.project) ??
        matchApp(apps, row.name);

      if (!app) {
        continue;
      }

      const signals: CategorySignalMap = {
        ...(typeof toNumber(row.open_interest) === "number" ? { open_interest: toNumber(row.open_interest) ?? 0 } : {}),
        ...(typeof toNumber(row.active_markets) === "number" ? { active_markets: toNumber(row.active_markets) ?? 0 } : {}),
        ...(typeof toNumber(row.resolved_market_volume) === "number"
          ? { resolved_market_volume: toNumber(row.resolved_market_volume) ?? 0 }
          : {}),
        ...(typeof toNumber(row.volume) === "number" ? { volume: toNumber(row.volume) ?? 0 } : {}),
        ...(typeof toNumber(row.liquidity_depth) === "number"
          ? { liquidity_depth: toNumber(row.liquidity_depth) ?? 0 }
          : {}),
        ...(typeof toNumber(row.apy) === "number" ? { apy: toNumber(row.apy) ?? 0 } : {}),
        ...(typeof toNumber(row.tvl) === "number" ? { tvl: toNumber(row.tvl) ?? 0 } : {}),
        ...(typeof toNumber(row.supported_asset_count) === "number"
          ? { supported_asset_count: toNumber(row.supported_asset_count) ?? 0 }
          : {})
      };

      results.push({
        appId: app.id,
        signals,
        source: "dune"
      });
    }

    return results;
  } catch {
    return [];
  }
}
