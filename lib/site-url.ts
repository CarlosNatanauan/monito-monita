/**
 * The app's own address, for every link people see, copy or share.
 *
 * NEXT_PUBLIC_SITE_URL (https://monitomonita-ph.vercel.app in production)
 * wins when it's set; otherwise the address the page was opened on
 * (localhost in dev, the preview URL on Vercel previews). Never a
 * hardcoded domain. Pure; safe on the server and in the browser.
 */
export function siteOrigin(current: string): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    try {
      return new URL(explicit).origin;
    } catch {
      // A malformed value falls back to the real origin.
    }
  }
  return current;
}

/**
 * Absolute base URL on the server (share images, metadata): the site URL,
 * else Vercel's production domain, else the deploy's own URL, else localhost.
 */
export function serverSiteUrl(): URL {
  const vercel =
    process.env.VERCEL_ENV === "production" ? process.env.VERCEL_PROJECT_PRODUCTION_URL : process.env.VERCEL_URL;
  return new URL(siteOrigin(vercel ? `https://${vercel}` : "http://localhost:3000"));
}
