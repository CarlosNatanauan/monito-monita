import { describe, expect, it, vi } from "vitest";
import {
  buildLandingCapture,
  isLandingView,
  LANDING_EVENT,
  referrerDomain,
  sendLandingView,
} from "@/server/landing-view";

const OWN = "monitomonita.app";
const config = { key: "phc_test", host: "https://us.i.posthog.com" };

describe("referrerDomain", () => {
  it("reduces Facebook and Messenger link wrappers to the site", () => {
    expect(referrerDomain("https://l.facebook.com/", OWN)).toBe("facebook.com");
    expect(referrerDomain("https://lm.facebook.com/l.php?u=https%3A%2F%2Fmonitomonita.app%2F&h=AT0", OWN)).toBe(
      "facebook.com",
    );
    expect(referrerDomain("https://m.facebook.com/groups/123/posts/456", OWN)).toBe("facebook.com");
    expect(referrerDomain("https://www.messenger.com/t/123", OWN)).toBe("messenger.com");
  });

  it("keeps only the domain of other launch posts, never paths or queries", () => {
    expect(referrerDomain("https://old.reddit.com/r/Philippines/comments/abc/secret_title/", OWN)).toBe("reddit.com");
    expect(referrerDomain("https://www.linkedin.com/feed/update/urn:li:activity:1/", OWN)).toBe("linkedin.com");
    expect(referrerDomain("https://lnkd.in/abc", OWN)).toBe("linkedin.com");
    expect(referrerDomain("https://t.co/xyz", OWN)).toBe("x.com");
    expect(referrerDomain("https://www.google.com.ph/", OWN)).toBe("google.com.ph");
    expect(referrerDomain("https://news.bbc.co.uk/x", OWN)).toBe("bbc.co.uk");
  });

  it("direct, internal, Android apps, and junk", () => {
    expect(referrerDomain(null, OWN)).toBe("direct");
    expect(referrerDomain("", OWN)).toBe("direct");
    expect(referrerDomain("https://monitomonita.app/g/abc123def456", OWN)).toBe("internal");
    expect(referrerDomain("http://localhost:3000/new", "localhost:3000")).toBe("internal");
    expect(referrerDomain("android-app://com.facebook.orca/", OWN)).toBe("app:com.facebook.orca");
    expect(referrerDomain("not a url", OWN)).toBe("other");
    expect(referrerDomain("https://192.168.1.1/", OWN)).toBe("other");
    expect(referrerDomain("ftp://files.example.com/", OWN)).toBe("other");
  });
});

describe("isLandingView", () => {
  const page = (extra: Record<string, string> = {}) =>
    new Headers({
      accept: "text/html,application/xhtml+xml",
      "sec-fetch-dest": "document",
      "user-agent": "Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile [FB_IAB/MESSENGER]",
      ...extra,
    });

  it("counts a person's page load", () => {
    expect(isLandingView("GET", page())).toBe(true);
  });

  it("skips prefetches, RSC requests, and non-GETs", () => {
    expect(isLandingView("GET", page({ rsc: "1" }))).toBe(false);
    expect(isLandingView("GET", page({ "next-router-prefetch": "1" }))).toBe(false);
    expect(isLandingView("GET", page({ "sec-purpose": "prefetch;prerender" }))).toBe(false);
    expect(isLandingView("HEAD", page())).toBe(false);
    expect(isLandingView("GET", page({ "sec-fetch-dest": "image" }))).toBe(false);
    expect(isLandingView("GET", page({ accept: "*/*" }))).toBe(false);
  });

  it("skips link-preview fetchers and bots", () => {
    for (const ua of [
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "Googlebot/2.1",
      "Mozilla/5.0 (compatible; Discordbot/2.0)",
      "Mozilla/5.0 ... Chrome-Lighthouse",
    ]) {
      expect(isLandingView("GET", page({ "user-agent": ua })), ua).toBe(false);
    }
  });
});

describe("buildLandingCapture", () => {
  it("sends only the referrer domain, with a one-off id and no person profile", () => {
    const { url, body } = buildLandingCapture(config, "facebook.com", "id-1", new Date(0));
    expect(url).toBe("https://us.i.posthog.com/i/v0/e/");
    expect(body).toEqual({
      api_key: "phc_test",
      event: LANDING_EVENT,
      distinct_id: "id-1",
      timestamp: "1970-01-01T00:00:00.000Z",
      properties: {
        referrer_domain: "facebook.com",
        $process_person_profile: false,
        $geoip_disable: true,
        $lib: "monito-monita-server",
      },
    });
  });

  it("uses a fresh random id each time", () => {
    const a = buildLandingCapture(config, "direct").body.distinct_id;
    const b = buildLandingCapture(config, "direct").body.distinct_id;
    expect(a).not.toBe(b);
  });
});

describe("sendLandingView", () => {
  it("never throws when PostHog is down", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("offline"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(sendLandingView(config, "direct", fetchImpl)).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
