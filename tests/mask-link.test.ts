import { describe, expect, it } from "vitest";
import { displayLink, MASK, maskLink } from "../lib/mask-link";

const TOKEN = "q8Zr2l1PfY0b-x_93KpLmN4sTuVwXyZaBcDeFgHiJkL";

describe("maskLink", () => {
  it("keeps the real path of a member link and hides only the token", () => {
    const masked = maskLink(`https://monitomonita-ph.vercel.app/g/abc123def456/me?t=${TOKEN}`);
    expect(masked).toBe(`monitomonita-ph.vercel.app/g/abc123def456/me?t=${MASK}`);
    expect(masked).not.toContain(TOKEN);
  });

  it("hides the token of an organizer link", () => {
    expect(maskLink(`https://monitomonita-ph.vercel.app/g/abc123def456/admin?t=${TOKEN}`)).toBe(
      `monitomonita-ph.vercel.app/g/abc123def456/admin?t=${MASK}`,
    );
  });

  it("keeps the port for local links", () => {
    expect(maskLink(`http://localhost:3000/g/abc/me?t=${TOKEN}`)).toBe(`localhost:3000/g/abc/me?t=${MASK}`);
  });

  it("works on a path (before the origin is known)", () => {
    const masked = maskLink(`/g/abc/me?t=${TOKEN}`);
    expect(masked).toBe(`/g/abc/me?t=${MASK}`);
    expect(masked).not.toContain(TOKEN);
  });

  it("never echoes an encoded token or other query parts", () => {
    expect(maskLink(`/g/abc/admin?t=${encodeURIComponent(TOKEN + "+/=")}&x=${TOKEN}`)).toBe(`/g/abc/admin?t=${MASK}`);
  });
});

describe("displayLink", () => {
  it("drops the scheme only", () => {
    expect(displayLink(`https://monitomonita-ph.vercel.app/g/abc/me?t=${TOKEN}`)).toBe(
      `monitomonita-ph.vercel.app/g/abc/me?t=${TOKEN}`,
    );
  });
});
