/**
 * Per-IP limits on creating groups, joining, and coming back with name +
 * PIN (Upstash Redis + @upstash/ratelimit).
 *
 * - Each action has its own budget of requests per IP.
 * - Join and come-back also share a budget of FAILURES per IP: taken-name
 *   results and wrong PINs. Once it's used up, those actions stop for that
 *   IP for a while, so names and PINs can't be checked in bulk.
 *
 * Off when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (or Vercel's
 * KV_REST_API_URL / KV_REST_API_TOKEN) are missing, e.g. locally. If Redis
 * is down or slow, requests are let through (the per-member PIN lockout
 * still applies).
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

export type LimitedAction = "create" | "join" | "comeback";

/** Generous enough for a whole office joining from one Wi-Fi. */
const ACTION_LIMITS: Record<LimitedAction, { tokens: number; window: `${number} ${"m" | "h"}` }> = {
  create: { tokens: 10, window: "1 h" },
  join: { tokens: 30, window: "10 m" },
  comeback: { tokens: 30, window: "10 m" },
};
const FAILURE_LIMIT = { tokens: 10, window: "15 m" } as const;

export const RATE_LIMITED_MESSAGE = "Ang dami nang subok mula sa network na 'to. Subukan ulit in a few minutes.";

type Limiters = Record<LimitedAction | "failures", Ratelimit>;

let cached: Limiters | null | undefined;

function limiters(): Limiters | null {
  if (cached !== undefined) return cached;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    cached = null;
    return cached;
  }
  const redis = new Redis({ url, token });
  const make = (name: string, { tokens, window }: { tokens: number; window: `${number} ${"m" | "h"}` }) =>
    new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(tokens, window),
      prefix: `mm:rl:${name}`,
      timeout: 1500, // fail open
      analytics: false,
    });
  cached = {
    create: make("create", ACTION_LIMITS.create),
    join: make("join", ACTION_LIMITS.join),
    comeback: make("comeback", ACTION_LIMITS.comeback),
    failures: make("failures", FAILURE_LIMIT),
  };
  return cached;
}

export function isRateLimitEnabled(): boolean {
  return limiters() !== null;
}

/**
 * The caller's IP. On Vercel, x-forwarded-for is set by the platform (a
 * client can't spoof the first entry); locally it may be missing.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip")?.trim() || "unknown";
}

/** Uses one request from the action's budget. False if this IP should wait. */
export async function allowRequest(action: LimitedAction, ip: string): Promise<boolean> {
  const l = limiters();
  if (!l) return true;
  try {
    const [request, failures] = await Promise.all([
      l[action].limit(ip),
      action === "create" ? null : l.failures.getRemaining(ip),
    ]);
    return request.success && (failures === null || failures.remaining > 0);
  } catch (error) {
    console.error("rate limit check failed (letting through)", error);
    return true;
  }
}

/** Counts a taken name or a wrong PIN against this IP. */
export async function recordFailure(ip: string): Promise<void> {
  const l = limiters();
  if (!l) return;
  try {
    await l.failures.limit(ip);
  } catch (error) {
    console.error("rate limit record failed", error);
  }
}
