import type { NextConfig } from "next";
import { REFERRER_POLICY } from "./lib/referrer-policy";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Pages that can carry or show secret links never send a Referer to
  // another site (see lib/referrer-policy.ts for why not "no-referrer").
  async headers() {
    return [
      // Group pages are for people with the link, never search results.
      {
        source: "/g/:path*",
        headers: [
          { key: "Referrer-Policy", value: REFERRER_POLICY },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      { source: "/new", headers: [{ key: "Referrer-Policy", value: REFERRER_POLICY }] },
      // The demo's start page and the cron job: never search results.
      { source: "/demo", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      // Prototypes: never indexed.
      { source: "/lab/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
