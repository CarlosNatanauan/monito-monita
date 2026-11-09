import { NextResponse, type NextRequest } from "next/server";
import {
  authCookieName,
  authCookieOptions,
  isValidLinkToken,
  isWellFormedToken,
  parsePersonalLinkPath,
} from "@/server/auth";

/**
 * Personal links: /g/<slug>/me?t=TOKEN and /g/<slug>/admin?t=TOKEN.
 *
 * Swaps the token for an httpOnly cookie, then redirects to the clean URL
 * so the token doesn't stay in the address bar or browser history.
 * A token that isn't valid for this group never overwrites an existing
 * cookie (a wrong link can't log you out of the right one).
 */
export async function proxy(request: NextRequest) {
  const link = parsePersonalLinkPath(request.nextUrl.pathname);
  const token = request.nextUrl.searchParams.get("t");

  if (!link || token === null) {
    const response = NextResponse.next();
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }

  const cleanUrl = request.nextUrl.clone();
  cleanUrl.searchParams.delete("t");
  const response = NextResponse.redirect(cleanUrl, 303);
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "no-store");

  let valid = false;
  try {
    valid = isWellFormedToken(token) && (await isValidLinkToken(link.role, link.slug, token));
  } catch (error) {
    // Database trouble: don't set anything; the page will ask for the link again.
    console.error("proxy: token check failed", error);
  }
  if (valid) {
    response.cookies.set(authCookieName(link.role, link.slug), token, authCookieOptions(link.slug));
  }
  return response;
}

export const config = {
  matcher: ["/g/:slug/me", "/g/:slug/admin"],
};
