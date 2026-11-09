import { createHash, timingSafeEqual } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

// Wrap timingSafeEqual (still the real implementation) so we can assert
// the hash comparison goes through it.
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return { ...actual, timingSafeEqual: vi.fn(actual.timingSafeEqual) };
});
import {
  authCookieName,
  authCookieOptions,
  COOKIE_MAX_AGE_SECONDS,
  createToken,
  findMemberByToken,
  findOrganizerByToken,
  hashToken,
  isValidSlug,
  isWellFormedToken,
  parsePersonalLinkPath,
  personalLinkPath,
  tokenMatchesHash,
} from "@/server/auth";

describe("createToken", () => {
  it("is 32 random bytes as base64url (43 URL-safe characters)", () => {
    const token = createToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
    expect(encodeURIComponent(token)).toBe(token); // safe in a URL as-is
  });

  it("never repeats", () => {
    const tokens = new Set(Array.from({ length: 1000 }, createToken));
    expect(tokens.size).toBe(1000);
  });
});

describe("isWellFormedToken", () => {
  it("accepts issued tokens and rejects anything else", () => {
    expect(isWellFormedToken(createToken())).toBe(true);
    for (const bad of ["", "short", `${createToken()}x`, `${createToken().slice(0, 42)}=`, "a".repeat(42) + "+", null, undefined, 42]) {
      expect(isWellFormedToken(bad)).toBe(false);
    }
  });
});

describe("hashToken", () => {
  it("is the SHA-256 hex digest", () => {
    const token = createToken();
    expect(hashToken(token)).toBe(createHash("sha256").update(token).digest("hex"));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("never contains the raw token", () => {
    const token = createToken();
    expect(hashToken(token)).not.toContain(token);
  });

  it("differs for different tokens", () => {
    expect(hashToken(createToken())).not.toBe(hashToken(createToken()));
  });
});

describe("tokenMatchesHash", () => {
  it("matches the right token", () => {
    const token = createToken();
    expect(tokenMatchesHash(token, hashToken(token))).toBe(true);
  });

  it("rejects a different token, a malformed token, or a malformed hash", () => {
    const token = createToken();
    const hash = hashToken(token);
    expect(tokenMatchesHash(createToken(), hash)).toBe(false);
    expect(tokenMatchesHash("not-a-token", hash)).toBe(false);
    expect(tokenMatchesHash(token, hash.slice(0, 63))).toBe(false);
    expect(tokenMatchesHash(token, hash.toUpperCase())).toBe(false);
    expect(tokenMatchesHash(token, "")).toBe(false);
  });

  it("compares in constant time (crypto.timingSafeEqual)", () => {
    const spy = vi.mocked(timingSafeEqual);
    spy.mockClear();
    const token = createToken();
    expect(tokenMatchesHash(token, hashToken(token))).toBe(true);
    expect(tokenMatchesHash(createToken(), hashToken(token))).toBe(false);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe("slugs and cookie names", () => {
  it("validates slugs", () => {
    expect(isValidSlug("k3x9m2pq7wzt")).toBe(true);
    for (const bad of ["", "ab", "UPPER123", "has space", "dots.here", "a/b", "x".repeat(33), null]) {
      expect(isValidSlug(bad)).toBe(false);
    }
  });

  it("uses one cookie per group and role", () => {
    expect(authCookieName("member", "abc123xyz")).toBe("mm_m_abc123xyz");
    expect(authCookieName("organizer", "abc123xyz")).toBe("mm_o_abc123xyz");
    expect(authCookieName("member", "abc123xyz")).not.toBe(authCookieName("member", "zzz999yyy"));
  });

  it("refuses unsafe slugs in cookie names and paths", () => {
    expect(() => authCookieName("member", "../evil")).toThrow();
    expect(() => authCookieOptions("bad slug")).toThrow();
    expect(() => personalLinkPath("member", "a;b=c", createToken())).toThrow();
  });
});

describe("authCookieOptions", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is httpOnly, secure, lax, scoped to the group, ~90 days", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(authCookieOptions("abc123xyz")).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/g/abc123xyz",
      maxAge: 90 * 24 * 60 * 60,
    });
    expect(COOKIE_MAX_AGE_SECONDS).toBe(7_776_000);
  });

  it("relaxes secure only in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(authCookieOptions("abc123xyz").secure).toBe(false);
    vi.stubEnv("NODE_ENV", "test");
    expect(authCookieOptions("abc123xyz").secure).toBe(true);
  });

  it("can expire a cookie immediately", () => {
    expect(authCookieOptions("abc123xyz", 0).maxAge).toBe(0);
  });
});

describe("personal links", () => {
  it("builds member and organizer links", () => {
    const token = createToken();
    expect(personalLinkPath("member", "abc123xyz", token)).toBe(`/g/abc123xyz/me?t=${token}`);
    expect(personalLinkPath("organizer", "abc123xyz", token)).toBe(`/g/abc123xyz/admin?t=${token}`);
  });

  it("parses link paths back into role and slug", () => {
    expect(parsePersonalLinkPath("/g/abc123xyz/me")).toEqual({ role: "member", slug: "abc123xyz" });
    expect(parsePersonalLinkPath("/g/abc123xyz/admin/")).toEqual({ role: "organizer", slug: "abc123xyz" });
  });

  it("ignores other paths", () => {
    for (const path of ["/", "/new", "/g/abc123xyz", "/g/abc123xyz/reveal", "/g/BAD/me", "/g/abc123xyz/me/extra"]) {
      expect(parsePersonalLinkPath(path)).toBeNull();
    }
  });
});

describe("lookups reject bad input before touching the database", () => {
  it("returns null for malformed slugs or tokens", async () => {
    // DATABASE_URL isn't set in unit tests, so any query would throw.
    expect(await findMemberByToken("abc123xyz", "nope")).toBeNull();
    expect(await findMemberByToken("BAD SLUG", createToken())).toBeNull();
    expect(await findOrganizerByToken("abc123xyz", "")).toBeNull();
    expect(await findOrganizerByToken("../x", createToken())).toBeNull();
  });
});
