import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// Vercel sets VERCEL=1 during its builds. Azure App Service needs a
// self-hosted standalone build in `build/`; Vercel supplies its own output
// via its adapter and expects the default `.next` distDir.
const isVercel = process.env.VERCEL === "1";

const nextConfig: NextConfig = isVercel
  ? {}
  : {
      distDir: "build",
      output: "standalone",
    };

export default withBundleAnalyzer(nextConfig);