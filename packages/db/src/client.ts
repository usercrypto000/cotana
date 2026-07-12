import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

// TODO: HARDENED FOR VERCEL PRODUCTION DEPLOYMENT
const getOptimizedUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  
  if (process.env.NODE_ENV === "production" && !url.includes("connection_limit")) {
    return `${url}${url.includes("?") ? "&" : "?"}connection_limit=2`;
  }
  return url;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: getOptimizedUrl()
    }
  }
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
