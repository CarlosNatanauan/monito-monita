import { describe, expect, it } from "vitest";
import { MASK, maskLink } from "../lib/mask-link";

const TOKEN = "q8Zr2l1PfY0b-x_93KpLmN4sTuVwXyZaBcDeFgHiJkL";

describe("maskLink", () => {
  it("hides the token and the slug of an absolute member link", () => {
    const masked = maskLink(`https://monitomonita-ph.vercel.app/g/abc123def456/me?t=${TOKEN}`);
    expect(masked).toBe(`monitomonita-ph.vercel.app/…/me?t=${MASK}`);
    expect(masked).not.toContain(TOKEN);
    expect(masked).not.toContain("abc123def456");
  });

  it("hides the token of an organizer link", () => {
    expect(maskLink(`https://monitomonita-ph.vercel.app/g/abc123def456/admin?t=${TOKEN}`)).toBe(
      `monitomonita-ph.vercel.app/…/admin?t=${MASK}`,
    );
  });

  it("keeps the port for local links", () => {
    expect(maskLink(`http://localhost:3000/g/abc/me?t=${TOKEN}`)).toBe(`localhost:3000/…/me?t=${MASK}`);
  });

  it("works on a path (before the origin is known)", () => {
    const masked = maskLink(`/g/abc/me?t=${TOKEN}`);
    expect(masked).toBe(`/…/me?t=${MASK}`);
    expect(masked).not.toContain(TOKEN);
  });

  it("never echoes an encoded token", () => {
    expect(maskLink(`/g/abc/admin?t=${encodeURIComponent(TOKEN + "+/=")}`)).toBe(`/…/admin?t=${MASK}`);
  });
});
