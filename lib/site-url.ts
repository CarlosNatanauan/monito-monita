/**
 * The app's own address, for every link people see, copy or share.
 *
 * NEXT_PUBLIC_SITE_URL (https://monitomonita-ph.vercel.app in production)
 * wins when it's set; otherwise the address the page was opened on
 * (localhost in dev, the preview URL on Vercel previews). Never a
 * hardcoded domain. Pure; safe on the server and in the browser. Only
 * NEXT_PUBLIC_ variables here: any other process.env read would pull the
 * `process` polyfill into every page's JS (see lib/server-site-url.ts).
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
