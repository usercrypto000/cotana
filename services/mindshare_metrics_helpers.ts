export function computeRepeatRate(
  walletInfo: Map<string, { days: Set<string> }>
): number {
  if (walletInfo.size === 0) return 0;
  let repeat = 0;
  for (const info of walletInfo.values()) {
    if (info.days.size >= 2) repeat++;
  }
  return repeat / walletInfo.size;
}

export function median(values: number[]): number {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

