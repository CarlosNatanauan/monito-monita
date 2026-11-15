import { siteOrigin } from "./site-url";

/**
 * Absolute base URL on the server (share images, metadata): the site URL,
 * else Vercel's production domain, else the deploy's own URL, else localhost.
 */
export function serverSiteUrl(): URL {
  const vercel =
    process.env.VERCEL_ENV === "production" ? process.env.VERCEL_PROJECT_PRODUCTION_URL : process.env.VERCEL_URL;
  return new URL(siteOrigin(vercel ? `https://${vercel}` : "http://localhost:3000"));
}
