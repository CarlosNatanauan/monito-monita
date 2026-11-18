/**
 * "landing_video_played": someone pressed play on the landing's demo video
 * (components/landing/demo-video.tsx posts to /api/landing-video, once per
 * press). Like "landing_viewed": no properties about the visitor at all, a
 * random one-off distinct id that isn't stored, no person profile, no
 * GeoIP, no cookies. Only same-site requests from a browser count, so a
 * post from another site or a script doesn't. Pure helpers are unit tested.
 */
import type { AnalyticsConfig } from "./analytics";
import { buildAnonymousCapture, isBot, sendAnonymous } from "./landing-view";

export const LANDING_VIDEO_EVENT = "landing_video_played";

/**
 * Whether a request is a play press from this site's landing page: a POST
 * the browser marks same-origin (or, without Sec-Fetch-Site, whose Origin
 * is this host), not from a bot.
 */
export function isLandingVideoPlay(method: string, headers: Headers, ownHost: string): boolean {
  if (method !== "POST") return false;
  const site = headers.get("sec-fetch-site");
  if (site !== null) {
    if (site !== "same-origin") return false;
  } else {
    const origin = headers.get("origin");
    if (!origin) return false;
    try {
      if (new URL(origin).host.toLowerCase() !== ownHost.toLowerCase()) return false;
    } catch {
      return false;
    }
  }
  return !isBot(headers.get("user-agent") ?? "");
}

/** The PostHog capture request for one play. Pure given `id` and `now`. */
export function buildLandingVideoCapture(config: AnalyticsConfig, id?: string, now?: Date) {
  return buildAnonymousCapture(config, LANDING_VIDEO_EVENT, {}, id, now);
}

/** Sends one play. Resolves either way; failures are only logged. */
export async function sendLandingVideoPlayed(config: AnalyticsConfig, fetchImpl: typeof fetch = fetch): Promise<void> {
  await sendAnonymous(buildLandingVideoCapture(config), LANDING_VIDEO_EVENT, fetchImpl);
}
