import { afterEach, describe, expect, it, vi } from "vitest";
import { siteOrigin } from "../lib/site-url";

describe("siteOrigin", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the page's real origin when NEXT_PUBLIC_SITE_URL isn't set", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(siteOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    expect(siteOrigin("https://monito-git-x.vercel.app")).toBe("https://monito-git-x.vercel.app");
  });

  it("uses NEXT_PUBLIC_SITE_URL when set (origin only, no trailing slash)", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://monitomonita-ph.vercel.app/");
    expect(siteOrigin("http://localhost:3000")).toBe("https://monitomonita-ph.vercel.app");
  });

  it("ignores a malformed NEXT_PUBLIC_SITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "not a url");
    expect(siteOrigin("http://localhost:3000")).toBe("http://localhost:3000");
  });
});
