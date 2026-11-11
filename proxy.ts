import { NextResponse, type NextRequest } from "next/server";
import {
  authCookieName,
  authCookieOptions,
  findMemberByToken,
  isValidLinkToken,
  isWellFormedToken,
  markLinkOpened,
  parsePersonalLinkPath,
  PENDING_SWITCH_MAX_AGE_SECONDS,
  pendingSwitchCookieName,
} from "@/server/auth";

/**
 * Personal links: /g/<slug>/me?t=TOKEN and /g/<slug>/admin?t=TOKEN.
 *
 * Swaps the token for an httpOnly cookie, then redirects to the clean URL
 * so the token doesn't stay in the address bar or browser history.
 * A token that isn't valid for this group never overwrites an existing
 * cookie (a wrong link can't log you out of the right one).
 *
 * If this device is already logged in as a different (active) member, the
 * new member's token is parked in a short-lived pending cookie instead, and
 * /me asks "Ikaw ba talaga si …?" before switching.
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

  try {
    if (!isWellFormedToken(token)) return response;

    if (link.role === "organizer") {
      if (await isValidLinkToken("organizer", link.slug, token)) {
        response.cookies.set(authCookieName("organizer", link.slug), token, authCookieOptions(link.slug));
      }
      return response;
    }

    const member = await findMemberByToken(link.slug, token);
    if (!member) return response;

    const cookieName = authCookieName("member", link.slug);
    const existing = request.cookies.get(cookieName)?.value;
    if (existing && existing !== token) {
      const current = await findMemberByToken(link.slug, existing);
      if (current && current.id !== member.id) {
        // Someone else is logged in here: confirm on /me before switching.
        response.cookies.set(
          pendingSwitchCookieName(link.slug),
          token,
          authCookieOptions(link.slug, PENDING_SWITCH_MAX_AGE_SECONDS),
        );
        return response;
      }
    }

    response.cookies.set(cookieName, token, authCookieOptions(link.slug));
    response.cookies.set(pendingSwitchCookieName(link.slug), "", authCookieOptions(link.slug, 0));
    await markLinkOpened(member.id);
  } catch (error) {
    // Database trouble: don't set anything; the page will ask for the link again.
    console.error("proxy: token check failed", error);
  }
  return response;
}

export const config = {
  matcher: ["/g/:slug/me", "/g/:slug/admin"],
};
