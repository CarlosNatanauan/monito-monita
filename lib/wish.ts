/** Wishlist helpers shared by server and client (pure). */

export const WISHLIST_MAX_ITEMS = 10;
export const WISH_TITLE_MAX = 80;
export const WISH_NOTE_MAX = 200;
export const WISH_URL_MAX = 500;

/**
 * Normalizes a pasted link: adds https:// when there's no scheme
 * ("shopee.ph/abc"), then only accepts http(s) URLs with a real host.
 * Returns null for anything else.
 */
export function normalizeWishUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname.includes(".") || url.username || url.password) return null;
  return url.toString();
}

/** "shopee.ph" for https://www.shopee.ph/product/123 */
export function displayDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
