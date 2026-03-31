import { prisma } from "../client";

export async function createSearchEvent(input: {
  userId?: string | null;
  query: string;
  normalizedQuery: string;
  categoryHint?: string | null;
}) {
  return prisma.searchEvent.create({
    data: {
      userId: input.userId ?? null,
      query: input.query,
      normalizedQuery: input.normalizedQuery,
      categoryHint: input.categoryHint ?? null
    }
  });
}

export async function recordSearchClick(input: {
  searchEventId: string;
  appId: string;
  position: number;
}) {
  return prisma.searchClick.create({
    data: {
      searchEventId: input.searchEventId,
      appId: input.appId,
      position: input.position
    }
  });
}
