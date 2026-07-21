import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Traces only the modules actually imported into `.next/standalone`,
  // keeping the deployed hybrid app under Azure SWA's 250 MB limit.
  output: "standalone",
};

export default withBundleAnalyzer(nextConfig);