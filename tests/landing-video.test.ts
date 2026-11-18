import { describe, expect, it, vi } from "vitest";
import { buildLandingVideoCapture, isLandingVideoPlay, LANDING_VIDEO_EVENT, sendLandingVideoPlayed } from "@/server/landing-video";

const OWN = "monitomonita-ph.vercel.app";
const config = { key: "phc_test", host: "https://us.i.posthog.com" };
const PHONE = "Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile [FB_IAB/MESSENGER]";

describe("isLandingVideoPlay", () => {
  const press = (extra: Record<string, string> = {}) =>
    new Headers({ "sec-fetch-site": "same-origin", origin: `https://${OWN}`, "user-agent": PHONE, ...extra });

  it("counts a play press from this site's own page", () => {
    expect(isLandingVideoPlay("POST", press(), OWN)).toBe(true);
  });

  it("ignores other sites, other methods and bots", () => {
    expect(isLandingVideoPlay("POST", press({ "sec-fetch-site": "cross-site" }), OWN)).toBe(false);
    expect(isLandingVideoPlay("POST", press({ "sec-fetch-site": "same-site" }), OWN)).toBe(false);
    expect(isLandingVideoPlay("GET", press(), OWN)).toBe(false);
    expect(isLandingVideoPlay("POST", press({ "user-agent": "curl/8.4.0" }), OWN)).toBe(false);
    expect(isLandingVideoPlay("POST", press({ "user-agent": "Mozilla/5.0 HeadlessChrome/130" }), OWN)).toBe(false);
  });

  it("without Sec-Fetch-Site, needs this host as the Origin", () => {
    const old = (origin?: string) => new Headers({ "user-agent": PHONE, ...(origin ? { origin } : {}) });
    expect(isLandingVideoPlay("POST", old(`https://${OWN}`), OWN)).toBe(true);
    expect(isLandingVideoPlay("POST", old("https://example.com"), OWN)).toBe(false);
    expect(isLandingVideoPlay("POST", old(), OWN)).toBe(false);
    expect(isLandingVideoPlay("POST", old("not a url"), OWN)).toBe(false);
  });
});

describe("buildLandingVideoCapture", () => {
  it("sends nothing about the visitor: a one-off id, no person profile, no GeoIP", () => {
    const { url, body } = buildLandingVideoCapture(config, "id-1", new Date(0));
    expect(url).toBe("https://us.i.posthog.com/i/v0/e/");
    expect(body).toEqual({
      api_key: "phc_test",
      event: LANDING_VIDEO_EVENT,
      distinct_id: "id-1",
      timestamp: "1970-01-01T00:00:00.000Z",
      properties: { $process_person_profile: false, $geoip_disable: true, $lib: "monito-monita-server" },
    });
  });

  it("uses a new random id every time", () => {
    expect(buildLandingVideoCapture(config).body.distinct_id).not.toBe(buildLandingVideoCapture(config).body.distinct_id);
  });
});

describe("sendLandingVideoPlayed", () => {
  it("never throws when PostHog is down", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("offline"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(sendLandingVideoPlayed(config, fetchImpl)).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
