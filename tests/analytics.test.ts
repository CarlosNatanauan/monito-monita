import { describe, expect, it, vi } from "vitest";
import { analyticsConfig, buildCapture, hashGroupId, sendEvent, sendFunnelEvent } from "@/server/analytics";

const GROUP_ID = "7f0c1e7a-3b0e-4d7e-9f4a-0a1b2c3d4e5f";
const config = { key: "phc_test", host: "https://eu.i.posthog.com" };

describe("analyticsConfig", () => {
  it("is off without a key (local dev)", () => {
    expect(analyticsConfig({})).toBeNull();
    expect(analyticsConfig({ POSTHOG_KEY: "  " })).toBeNull();
  });

  it("reads the key and host, defaulting to the US cloud", () => {
    expect(analyticsConfig({ POSTHOG_KEY: "phc_x" })).toEqual({ key: "phc_x", host: "https://us.i.posthog.com" });
    expect(analyticsConfig({ POSTHOG_KEY: "phc_x", POSTHOG_HOST: "https://eu.i.posthog.com/" })).toEqual({
      key: "phc_x",
      host: "https://eu.i.posthog.com",
    });
    expect(analyticsConfig({ NEXT_PUBLIC_POSTHOG_KEY: "phc_y" })?.key).toBe("phc_y");
  });
});

describe("hashGroupId", () => {
  it("is stable, short, and doesn't contain the id", () => {
    const hash = hashGroupId(GROUP_ID);
    expect(hash).toBe(hashGroupId(GROUP_ID));
    expect(hash).toMatch(/^[0-9a-f]{32}$/);
    expect(hash).not.toContain(GROUP_ID.slice(0, 8));
    expect(hashGroupId("another-id")).not.toBe(hash);
  });
});

describe("buildCapture", () => {
  it("sends the hashed group as distinct id, no person profile, no GeoIP", () => {
    const { url, body } = buildCapture(config, "names_drawn", GROUP_ID, { members: 12, redraw: false }, new Date(0));
    expect(url).toBe("https://eu.i.posthog.com/i/v0/e/");
    expect(body).toEqual({
      api_key: "phc_test",
      event: "names_drawn",
      distinct_id: hashGroupId(GROUP_ID),
      timestamp: "1970-01-01T00:00:00.000Z",
      properties: {
        members: 12,
        redraw: false,
        group: hashGroupId(GROUP_ID),
        $process_person_profile: false,
        $geoip_disable: true,
        $lib: "monito-monita-server",
      },
    });
  });

  it("never includes the raw group id, a slug, or a URL", () => {
    const events = [
      buildCapture(config, "group_created", GROUP_ID, { themes: 4 }),
      buildCapture(config, "member_joined", GROUP_ID, {}),
      buildCapture(config, "slip_opened", GROUP_ID, {}),
      buildCapture(config, "wishlist_item_added", GROUP_ID, { has_link: true }),
      buildCapture(config, "reminder_copied", GROUP_ID, { kind: "theme" }),
      buildCapture(config, "reveal_started", GROUP_ID, {}),
      buildCapture(config, "reveal_finished", GROUP_ID, {}),
    ];
    for (const { body } of events) {
      const json = JSON.stringify(body);
      expect(json).not.toContain(GROUP_ID);
      expect(json).not.toMatch(/\$current_url|\$pathname|\$referrer|\/g\//);
    }
  });
});

describe("sendEvent", () => {
  it("POSTs the event as JSON", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    await sendEvent(config, "member_joined", GROUP_ID, {}, fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://eu.i.posthog.com/i/v0/e/");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body)).event).toBe("member_joined");
  });

  it("never throws when PostHog is down or slow", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failing = vi.fn(async () => {
      throw new Error("network down");
    });
    await expect(sendEvent(config, "slip_opened", GROUP_ID, {}, failing as unknown as typeof fetch)).resolves.toBeUndefined();
    const http500 = vi.fn(async () => new Response("", { status: 500 }));
    await expect(sendEvent(config, "slip_opened", GROUP_ID, {}, http500 as unknown as typeof fetch)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});

describe("demo groups and the funnel", () => {
  const ok = () => vi.fn(async () => new Response(null, { status: 200 }));

  it("drops funnel events from a demo group", async () => {
    const fetchImpl = ok();
    await sendFunnelEvent(config, "slip_opened", GROUP_ID, {}, { isDemo: async () => true, fetchImpl });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends funnel events from a real group", async () => {
    const fetchImpl = ok();
    await sendFunnelEvent(config, "names_drawn", GROUP_ID, { members: 9, redraw: false }, { isDemo: async () => false, fetchImpl });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("drops the event when the demo check fails (a demo must never count)", async () => {
    const fetchImpl = ok();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const isDemo = async (): Promise<boolean> => {
      throw new Error("db down");
    };
    await sendFunnelEvent(config, "member_joined", GROUP_ID, {}, { isDemo, fetchImpl });
    expect(fetchImpl).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("demo_started has its own fixed-word properties, nothing identifying", () => {
    const { body } = buildCapture(config, "demo_started", GROUP_ID, { custom_name: true, reset: false });
    expect(body.event).toBe("demo_started");
    expect(body.properties).toMatchObject({ custom_name: true, reset: false, group: hashGroupId(GROUP_ID) });
    expect(JSON.stringify(body)).not.toContain(GROUP_ID);
  });
});
