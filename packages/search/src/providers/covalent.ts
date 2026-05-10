import type { CategorySignalMap } from "@cotana/types";

type SignalRefreshApp = {
  id: string;
  slug: string;
  name: string;
};

type CovalentCategory = "defi" | "lending-yield" | "prediction-markets";

export type CovalentSignalResult = {
  appId: string;
  signals: CategorySignalMap;
  source: "covalent";
};

export function isCovalentConfigured() {
  return Boolean(process.env.COVALENT_API_KEY);
}

export async function fetchCovalentSignals(
  _category: CovalentCategory,
  _apps: SignalRefreshApp[],
): Promise<CovalentSignalResult[]> {
  if (!isCovalentConfigured()) {
    return [];
  }

  // Covalent's current APIs are address-oriented. Cotana needs per-app contract
  // addresses or protocol identifiers before this can safely emit app signals.
  return [];
}
