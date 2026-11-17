import { siteOrigin } from "./site-url";

/**
 * The address a page was opened on, from the request headers (server
 * side), for a link that must be absolute before the page reaches the
 * browser (the reveal screen's QR code). NEXT_PUBLIC_SITE_URL wins when
 * set, exactly like links made in the browser (lib/site-url.ts).
 */
export function requestOrigin(headers: Headers): string {
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost:3000";
  const forwarded = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  // Vercel always sets x-forwarded-proto; without it (a bare local server) it's plain http.
  const proto = forwarded === "https" ? "https" : "http";
  return siteOrigin(`${proto}://${host.split(",")[0].trim()}`);
}
