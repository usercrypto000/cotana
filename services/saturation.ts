type SaturationResult = {
  score: number | null;
  status: "EARLY" | "ACTIVE" | "SATURATED" | "ENDING";
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const computeSaturation = (
  uaw7d?: number | null,
  txCount7d?: number | null,
  endAt?: Date | null
): SaturationResult => {
  const now = Date.now();
  if (endAt && endAt.getTime() - now <= 1000 * 60 * 60 * 24 * 14) {
    return { score: 90, status: "ENDING" };
  }

  const uawScore = uaw7d ? Math.log10(uaw7d + 1) * 20 : 0;
  const txScore = txCount7d ? Math.log10(txCount7d + 1) * 10 : 0;
  const score = clamp(Math.round(uawScore + txScore), 0, 100);
  const status =
    score <= 33 ? "EARLY" : score <= 66 ? "ACTIVE" : "SATURATED";

  return { score, status };
};
