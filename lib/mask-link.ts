/** The dots that stand in for a secret token on screen. */
export const MASK = "••••••";

/**
 * A personal link as it may appear on screen: the host and the end of the
 * path, with the token replaced by dots ("monitomonita.app/…/me?t=••••••").
 * People screenshot their page, so the token itself is never shown; Copy
 * and Share still use the full link. Pure; works on paths too.
 */
export function maskLink(link: string): string {
  let url: URL;
  try {
    url = new URL(link, "http://localhost");
  } catch {
    return `…?t=${MASK}`;
  }
  const isAbsolute = /^https?:\/\//i.test(link);
  const last = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
  const host = isAbsolute ? url.host : "";
  return `${host}/…/${last}?t=${MASK}`;
}
