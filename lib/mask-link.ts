/** The dots that stand in for a secret token on screen. */
export const MASK = "••••••••••";

/**
 * A personal or organizer link as it may appear on screen: the real link
 * with only the token replaced by dots
 * ("monitomonita-ph.vercel.app/g/barkada-2026/me?t=••••••••••"). People
 * screenshot their page, so the token itself is never shown until they
 * tap "Ipakita"; Copy and Share still use the full link. The slug is the
 * public share link, so it stays. Pure; works on paths too.
 */
export function maskLink(link: string): string {
  let url: URL;
  try {
    url = new URL(link, "http://localhost");
  } catch {
    return `…?t=${MASK}`;
  }
  const isAbsolute = /^https?:\/\//i.test(link);
  const host = isAbsolute ? url.host : "";
  return `${host}${url.pathname}?t=${MASK}`;
}

/** The link as shown in full ("Ipakita"): without the scheme, like the masked one. */
export function displayLink(link: string): string {
  return link.replace(/^https?:\/\//i, "");
}
