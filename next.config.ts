import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  distDir: 'build',
  output: 'standalone',
  env: {
    API_BASE_URL: process.env.API_BASE_URL,
  },
};

export default withBundleAnalyzer(nextConfig);