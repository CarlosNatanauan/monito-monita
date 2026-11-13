/**
 * "landing_viewed": one event per real page load of the landing page (/),
 * so launch posts can be compared. Sent from the proxy (server side), so
 * the landing page itself stays static with no analytics script.
 *
 * The only property is the referrer's DOMAIN ("facebook.com"), never the
 * full referrer URL, and never anything about the visitor: no cookies, no
 * IP, no user agent, no URL (only / is ever counted, so no slugs or
 * tokens). Each event gets a random one-off distinct id that isn't stored
 * anywhere, so visits can't be linked together. No person profiles, no
 * GeoIP. Pure helpers below are unit tested.
 */
import { randomUUID } from "node:crypto";
import type { AnalyticsConfig } from "./analytics";

export const LANDING_EVENT = "landing_viewed";

// Link wrappers and short links, by the site they stand for.
const ALIASES: Record<string, string> = {
  "fb.me": "facebook.com",
  "fb.com": "facebook.com",
  "m.me": "messenger.com",
  "lnkd.in": "linkedin.com",
  "t.co": "x.com",
  "twitter.com": "x.com",
  "redd.it": "reddit.com",
  "youtu.be": "youtube.com",
};
// Second-level labels under a country code ("google.com.ph", "bbc.co.uk").
const SECOND_LEVEL = new Set(["com", "co", "net", "org", "gov", "edu", "ac"]);
const LABEL = /^[a-z0-9-]{1,63}$/;

/**
 * The site a visit came from, as a bare domain: "facebook.com" for
 * l.facebook.com/lm.facebook.com, "reddit.com" for old.reddit.com.
 * "direct" with no referrer, "internal" from this site, "app:<package>"
 * from an Android app, "other" for anything unparseable.
 */
export function referrerDomain(referer: string | null | undefined, ownHost: string): string {
  if (!referer) return "direct";
  let url: URL;
  try {
    url = new URL(referer);
  } catch {
    return "other";
  }
  if (url.protocol === "android-app:") {
    const pkg = url.hostname.toLowerCase();
    return /^[a-z0-9._]{1,80}$/.test(pkg) ? `app:${pkg}` : "other";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "other";

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (host === ownHost.toLowerCase().replace(/:\d+$/, "")) return "internal";
  const labels = host.split(".");
  if (labels.length < 2 || !labels.every((l) => LABEL.test(l)) || /^\d+$/.test(labels.at(-1)!)) return "other";

  const keep = labels.length >= 3 && labels.at(-1)!.length === 2 && SECOND_LEVEL.has(labels.at(-2)!) ? 3 : 2;
  const domain = labels.slice(-keep).join(".");
  return ALIASES[domain] ?? domain;
}

const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|meta-externalagent|whatsapp|telegram|discord|skype|embedly|lighthouse|headless|curl|wget|python|node-fetch/i;

/**
 * Whether a request to / is a person's page load worth counting: a GET for
 * the HTML document, not a router prefetch or RSC request, not a link
 * preview fetcher or other bot.
 */
export function isLandingView(method: string, headers: Headers): boolean {
  if (method !== "GET") return false;
  if (headers.has("rsc") || headers.has("next-router-prefetch") || headers.has("next-router-state-tree")) return false;
  const purpose = `${headers.get("purpose") ?? ""} ${headers.get("sec-purpose") ?? ""}`.toLowerCase();
  if (purpose.includes("prefetch") || purpose.includes("prerender")) return false;
  const dest = headers.get("sec-fetch-dest");
  if (dest && dest !== "document") return false;
  if (!(headers.get("accept") ?? "").includes("text/html")) return false;
  return !BOTS.test(headers.get("user-agent") ?? "");
}

/** The PostHog capture request for one landing view. Pure given `id` and `now`. */
export function buildLandingCapture(
  config: AnalyticsConfig,
  referrer: string,
  id: string = randomUUID(),
  now: Date = new Date(),
): { url: string; body: Record<string, unknown> } {
  return {
    url: `${config.host}/i/v0/e/`,
    body: {
      api_key: config.key,
      event: LANDING_EVENT,
      distinct_id: id,
      timestamp: now.toISOString(),
      properties: {
        referrer_domain: referrer,
        $process_person_profile: false,
        $geoip_disable: true,
        $lib: "monito-monita-server",
      },
    },
  };
}

/** Sends one landing view. Resolves either way; failures are only logged. */
export async function sendLandingView(
  config: AnalyticsConfig,
  referrer: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const { url, body } = buildLandingCapture(config, referrer);
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) console.warn(`analytics: ${LANDING_EVENT} → HTTP ${response.status}`);
  } catch (error) {
    console.warn(`analytics: ${LANDING_EVENT} not sent`, error instanceof Error ? error.message : error);
  }
}
