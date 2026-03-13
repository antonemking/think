import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3', 'pdf-parse'],
  turbopack: {
    resolveAlias: {
      canvas: { browser: '' },
    },
  },
};

export default nextConfig;
