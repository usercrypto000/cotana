import { listChains } from "@/services/chainConfig";

export const DEFAULT_MIN_SCORE = 75;
export const DEFAULT_MIN_USD = 500;

const WINDOW_SECONDS: Record<string, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "24h": 86400,
};

export function parseWindow(value: string | null) {
  return WINDOW_SECONDS[value ?? ""] ?? WINDOW_SECONDS["5m"];
}

export function parseChainIds(value: string | null) {
  const chains = listChains();
  if (!value || value === "all") return chains.map((chain) => chain.id);
  const id = Number(value);
  if (!Number.isFinite(id)) return chains.map((chain) => chain.id);
  return [id];
}

export function getStablecoinMap() {
  const map = new Map<number, Set<string>>();
  for (const chain of listChains()) {
    map.set(chain.id, new Set(chain.stablecoins.map((token) => token.toLowerCase())));
  }
  return map;
}

export function isAscii(value: string) {
  return /^[\x20-\x7E]+$/.test(value);
}

export function normalizeTokenLabel(value: string | null | undefined) {
  if (!value) return "Unknown";
  if (!isAscii(value)) return "Unknown";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "Unknown";
}

export function shortAddress(address: string) {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function parseCsv(value: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function parseToggle(value: string | null, key: string, defaultValue: boolean) {
  if (!value) return defaultValue;
  const toggles = new Set(parseCsv(value));
  if (toggles.has(key)) return true;
  if (toggles.has(`no-${key}`)) return false;
  return defaultValue;
}

export function parseBoolean(value: string | null, defaultValue: boolean) {
  if (value === null) return defaultValue;
  return value === "true" || value === "1";
}

export function bucketTime(timestamp: number, bucketSeconds: number) {
  return Math.floor(timestamp / bucketSeconds) * bucketSeconds;
}