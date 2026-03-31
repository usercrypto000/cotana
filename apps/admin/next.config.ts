import type { NextConfig } from "next";

const nextConfig = {
  experimental: {
    nodeMiddleware: true
  } as NextConfig["experimental"] & {
    nodeMiddleware: boolean;
  },
  transpilePackages: [
    "@cotana/analytics",
    "@cotana/auth",
    "@cotana/config",
    "@cotana/db",
    "@cotana/search",
    "@cotana/types",
    "@cotana/ui"
  ]
} satisfies NextConfig;

export default nextConfig;
