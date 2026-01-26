export const isExternalUrl = (value: string) => /^https?:\/\//i.test(value);

export const getCardSummary = (description?: string | null) => {
  const trimmed = description?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "No summary provided.";
};

export const formatRewardLabel = (type: string, symbol?: string | null) => {
  const upper = type.toUpperCase();
  if (upper === "POINTS") return "Points";
  if (upper === "TOKEN" && symbol) return symbol;
  if (upper === "FEES") return symbol ? `Fees • ${symbol}` : "Fees";
  return symbol ? `Reward • ${symbol}` : "Reward";
};
