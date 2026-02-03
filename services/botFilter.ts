import { prisma } from "./prisma";

function median(nums: number[]) {
  if (nums.length === 0) return 0;
  nums.sort((a, b) => a - b);
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 === 0 ? (nums[mid - 1] + nums[mid]) / 2 : nums[mid];
}

import { getCachedBotScore, setCachedBotScore } from "./botScoreCache";

export async function computeBotScore(chainId: number, wallet: string, window: string = "24h") {
  // Check cache first
  const cached = await getCachedBotScore(chainId, wallet, window);
  if (cached !== null && typeof cached !== "undefined") return cached;

  // Simple heuristic based on last `window` interactions
  const hours = window === "7d" ? 24 * 7 : 24;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const rows = await prisma.addressInteraction.findMany({ where: { chainId, wallet, blockTime: { gte: since } }, select: { address: true, blockTime: true } });
  const txCount = rows.length;
  if (txCount === 0) return 0;
  const dests = new Set(rows.map((r) => r.address));
  const destDiversity = dests.size;
  const times = rows.map((r) => r.blockTime.getTime()).sort();
  const intervals: number[] = [];
  for (let i = 1; i < times.length; i++) intervals.push(times[i] - times[i - 1]);
  const medianInterval = median(intervals) || 0;

  // Normalize features into 0-100 contributions
  const txRateScore = Math.min(100, txCount * 2); // more txs -> higher bot suspicion
  const diversityScore = Math.max(0, 100 - destDiversity * 10); // low diversity -> more bot-like
  const intervalScore = medianInterval <= 60_000 ? 100 : Math.max(0, 100 - (medianInterval / (60_000 * 60))); // very fast txs -> bot

  const score = Math.round((0.5 * txRateScore + 0.3 * diversityScore + 0.2 * intervalScore));
  const final = Math.max(0, Math.min(100, score));
  // cache result
  await setCachedBotScore(chainId, wallet, window, final);
  return final;
}
