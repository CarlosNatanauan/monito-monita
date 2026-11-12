/**
 * Product analytics (PostHog), sent from the server only.
 *
 * Why server-side: there's no PostHog script in the browser at all, so no
 * session recording, no autocapture of clicks or form inputs, no cookies,
 * and no URLs with slugs or tokens (pageviews) can ever be sent.
 *
 * What's sent: one of the funnel events below, with a hashed group id as
 * both the distinct id and the `group` property, so a PostHog funnel over
 * distinct ids is a funnel of groups. Properties are counts, booleans, or
 * fixed words (typed per event): never names, PINs, tokens, slugs, wishlist
 * text, or the raw group id. No person profiles are created, and GeoIP is
 * off (the request comes from Vercel, not the user, anyway).
 *
 * Without POSTHOG_KEY (local dev, tests) nothing is sent. Sending happens
 * after the response (`after`) and never fails or slows down the request.
 */
import { createHash } from "node:crypto";
import { after } from "next/server";

export interface AnalyticsEvents {
  group_created: { themes: number };
  member_joined: Record<string, never>;
  names_drawn: { members: number; redraw: boolean };
  slip_opened: Record<string, never>;
  wishlist_item_added: { has_link: boolean };
  reminder_copied: { kind: "invite" | "drawn" | "theme" };
  reveal_started: Record<string, never>;
  reveal_finished: Record<string, never>;
}

export type AnalyticsEvent = keyof AnalyticsEvents;

export interface AnalyticsConfig {
  key: string;
  host: string;
}

const DEFAULT_HOST = "https://us.i.posthog.com";

/** PostHog settings from the environment, or null to skip tracking. */
export function analyticsConfig(env: Record<string, string | undefined> = process.env): AnalyticsConfig | null {
  const key = (env.POSTHOG_KEY || env.NEXT_PUBLIC_POSTHOG_KEY || "").trim();
  if (!key) return null;
  const host = (env.POSTHOG_HOST || DEFAULT_HOST).trim().replace(/\/+$/, "");
  return { key, host };
}

/**
 * A stable, non-reversible id for a group: SHA-256 of its internal UUID
 * (which never leaves the server), so it can't be matched to a share link.
 */
export function hashGroupId(groupId: string): string {
  return createHash("sha256").update(`monito-monita:group:${groupId}`).digest("hex").slice(0, 32);
}

/** The PostHog capture request for one event. Pure. */
export function buildCapture<E extends AnalyticsEvent>(
  config: AnalyticsConfig,
  event: E,
  groupId: string,
  props: AnalyticsEvents[E],
  now: Date = new Date(),
): { url: string; body: Record<string, unknown> } {
  const group = hashGroupId(groupId);
  return {
    url: `${config.host}/i/v0/e/`,
    body: {
      api_key: config.key,
      event,
      distinct_id: group,
      timestamp: now.toISOString(),
      properties: {
        ...props,
        group,
        $process_person_profile: false,
        $geoip_disable: true,
        $lib: "monito-monita-server",
      },
    },
  };
}

/** Sends one event. Resolves either way; failures are only logged. */
export async function sendEvent<E extends AnalyticsEvent>(
  config: AnalyticsConfig,
  event: E,
  groupId: string,
  props: AnalyticsEvents[E],
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const { url, body } = buildCapture(config, event, groupId, props);
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) console.warn(`analytics: ${event} → HTTP ${response.status}`);
  } catch (error) {
    console.warn(`analytics: ${event} not sent`, error instanceof Error ? error.message : error);
  }
}

/**
 * Tracks a funnel event after the response is sent. Call from Server
 * Actions only, after the change succeeded. No-op without POSTHOG_KEY.
 */
export function track<E extends AnalyticsEvent>(event: E, groupId: string, props: AnalyticsEvents[E]): void {
  const config = analyticsConfig();
  if (!config) return;
  after(() => sendEvent(config, event, groupId, props));
}
