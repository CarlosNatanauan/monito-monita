import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";
import { REFERRER_POLICY } from "@/lib/referrer-policy";

describe("Referrer-Policy (persona test B1)", () => {
  it("is same-origin: no Referer to other sites, but a real Origin on early form posts", () => {
    expect(REFERRER_POLICY).toBe("same-origin");
  });

  it("is set on every page that can carry or show a secret link", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    for (const source of ["/g/:path*", "/new"]) {
      const rule = rules.find((r) => r.source === source);
      expect(rule?.headers).toContainEqual({ key: "Referrer-Policy", value: "same-origin" });
    }
  });
});
