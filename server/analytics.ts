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
 * Demo groups (server/demo.ts) stay out of the funnel: `track` checks the
 * group first and drops funnel events from a demo. A demo sends only its
 * own `demo_started` event (trackDemoStarted).
 *
 * Without POSTHOG_KEY (local dev, tests) nothing is sent. Sending happens
 * after the response (`after`) and never fails or slows down the request.
 */
import { createHash } from "node:crypto";
import { after } from "next/server";
import { isDemoGroup } from "./groups";

export interface AnalyticsEvents {
  group_created: { themes: number };
  member_joined: Record<string, never>;
  names_drawn: { members: number; redraw: boolean };
  slip_opened: Record<string, never>;
  wishlist_item_added: { has_link: boolean };
  reminder_copied: { kind: "invite" | "drawn" | "theme" };
  reveal_started: Record<string, never>;
  reveal_finished: Record<string, never>;
  /** Outside the funnel: a one-click demo was made (or rebuilt with Reset demo). */
  demo_started: { custom_name: boolean; reset: boolean };
}

export type AnalyticsEvent = keyof AnalyticsEvents;
/** The group funnel: every event except the demo's own. */
export type FunnelEvent = Exclude<AnalyticsEvent, "demo_started">;

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
 * Sends a funnel event unless the group is a demo. If the demo check
 * itself fails, the event is dropped: a demo must never count as a group.
 */
export async function sendFunnelEvent<E extends FunnelEvent>(
  config: AnalyticsConfig,
  event: E,
  groupId: string,
  props: AnalyticsEvents[E],
  { isDemo, fetchImpl = fetch }: { isDemo: (groupId: string) => Promise<boolean>; fetchImpl?: typeof fetch },
): Promise<void> {
  try {
    if (await isDemo(groupId)) return;
  } catch (error) {
    console.warn(`analytics: ${event} dropped (demo check failed)`, error instanceof Error ? error.message : error);
    return;
  }
  await sendEvent(config, event, groupId, props, fetchImpl);
}

/**
 * Tracks a funnel event after the response is sent. Call from Server
 * Actions only, after the change succeeded. No-op without POSTHOG_KEY;
 * skipped for demo groups.
 */
export function track<E extends FunnelEvent>(event: E, groupId: string, props: AnalyticsEvents[E]): void {
  const config = analyticsConfig();
  if (!config) return;
  after(() => sendFunnelEvent(config, event, groupId, props, { isDemo: isDemoGroup }));
}

/** The demo's own event (not part of the group funnel). */
export function trackDemoStarted(groupId: string, props: AnalyticsEvents["demo_started"]): void {
  const config = analyticsConfig();
  if (!config) return;
  after(() => sendEvent(config, "demo_started", groupId, props));
}
