import { afterEach, describe, expect, it, vi } from "vitest";
import { requestOrigin } from "@/lib/request-origin";

afterEach(() => vi.unstubAllEnvs());

describe("requestOrigin", () => {
  it("uses the forwarded host and protocol (Vercel)", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    const h = new Headers({ host: "internal", "x-forwarded-host": "preview-abc.vercel.app", "x-forwarded-proto": "https" });
    expect(requestOrigin(h)).toBe("https://preview-abc.vercel.app");
  });

  it("is plain http on a local server (also opened from a phone on the Wi-Fi)", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(requestOrigin(new Headers({ host: "localhost:3000" }))).toBe("http://localhost:3000");
    expect(requestOrigin(new Headers({ host: "192.168.1.20:3000" }))).toBe("http://192.168.1.20:3000");
  });

  it("prefers NEXT_PUBLIC_SITE_URL, like every other link", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://monitomonita-ph.vercel.app/");
    const h = new Headers({ "x-forwarded-host": "preview-abc.vercel.app", "x-forwarded-proto": "https" });
    expect(requestOrigin(h)).toBe("https://monitomonita-ph.vercel.app");
  });
});
