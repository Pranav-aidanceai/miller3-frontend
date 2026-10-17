import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// Vercel sets VERCEL=1 during its builds. Azure App Service needs a
// self-hosted standalone build in `build/`; Vercel supplies its own output
// via its adapter and expects the default `.next` distDir.
const isVercel = process.env.VERCEL === "1";

const securityHeaders = [
  // Browsers use HTTPS only for this site. Trial value (5 minutes) while we
  // confirm nothing breaks — raise to 31536000 (one year) afterwards. No
  // `preload`: it isn't possible for an azurewebsites.net subdomain.
  { key: "Strict-Transport-Security", value: "max-age=300; includeSubDomains" },
  // Nobody can embed the site in an iframe (clickjacking). CSP is limited to
  // frame-ancestors on purpose; a full policy needs testing against Next.js
  // inline scripts.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // Browsers must not guess content types.
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const shared: NextConfig = {
  poweredByHeader: false, // drop the "X-Powered-By: Next.js" banner
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

const nextConfig: NextConfig = isVercel
  ? shared
  : { ...shared, distDir: "build", output: "standalone" };

export default withBundleAnalyzer(nextConfig);
