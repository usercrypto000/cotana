import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@cotana/analytics",
    "@cotana/auth",
    "@cotana/config",
    "@cotana/db",
    "@cotana/search",
    "@cotana/types",
    "@cotana/ui"
  ]
};

export default nextConfig;

