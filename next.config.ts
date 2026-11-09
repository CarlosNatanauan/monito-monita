import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Pages that can carry or show secret links never send a Referer.
  async headers() {
    return [
      { source: "/g/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
      { source: "/new", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
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
