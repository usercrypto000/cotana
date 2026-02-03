import { prisma } from "./prisma";

export async function getCachedBotScore(chainId: number, wallet: string, window = "24h") {
  const row = await prisma.walletBotScore.findUnique({ where: { chainId_wallet_window: { chainId, wallet, window } as any } as any }).catch(() => null);
  if (!row) return null;
  return row.score;
}

export async function setCachedBotScore(chainId: number, wallet: string, window: string, score: number) {
  await prisma.walletBotScore.upsert({
    where: { chainId_wallet_window: { chainId, wallet, window } as any } as any,
    create: { chainId, wallet, window, score },
    update: { score },
  }).catch(() => null);
}
