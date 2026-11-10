import { describe, expect, it } from "vitest";
import { CODENAMES, pickCodename } from "@/server/codenames";
import { duplicateNameHint, isSameName, joinSchema, MAX_MEMBERS, normalizeDisplayName } from "@/server/members";

describe("codenames", () => {
  it("has 150+ unique, tidy codenames (enough for a full group)", () => {
    expect(CODENAMES.length).toBeGreaterThanOrEqual(150);
    expect(CODENAMES.length).toBeGreaterThanOrEqual(MAX_MEMBERS);
    expect(new Set(CODENAMES).size).toBe(CODENAMES.length);
    expect(new Set(CODENAMES.map((c) => c.toLowerCase())).size).toBe(CODENAMES.length);
    for (const name of CODENAMES) {
      expect(name, name).toBe(name.trim());
      expect(name, name).not.toMatch(/\s{2,}/);
      expect(name.length, name).toBeLessThanOrEqual(30);
    }
  });

  it("includes the classics", () => {
    expect(CODENAMES).toContain("Bibingka Bandit");
    expect(CODENAMES).toContain("Parol Patrol");
  });

  it("never picks a taken codename", () => {
    const taken = CODENAMES.slice(0, CODENAMES.length - 3);
    for (let i = 0; i < 100; i++) {
      const picked = pickCodename(taken);
      expect(taken).not.toContain(picked);
      expect(CODENAMES).toContain(picked);
    }
  });

  it("can hand out a unique codename to every member of a full group", () => {
    const taken: string[] = [];
    for (let i = 0; i < MAX_MEMBERS; i++) taken.push(pickCodename(taken));
    expect(new Set(taken).size).toBe(MAX_MEMBERS);
  });

  it("adds a number when every codename is used", () => {
    const picked = pickCodename(CODENAMES);
    expect(picked).toMatch(/ 2$/);
    expect(CODENAMES).toContain(picked.replace(/ 2$/, ""));
    expect(pickCodename([...CODENAMES, ...CODENAMES.map((c) => `${c} 2`)])).toMatch(/ 3$/);
  });
});

describe("names", () => {
  it("normalizes whitespace", () => {
    expect(normalizeDisplayName("  Joy   Cruz ")).toBe("Joy Cruz");
    expect(normalizeDisplayName("Joy\tC.")).toBe("Joy C.");
  });

  it("treats names as the same regardless of case and spacing", () => {
    expect(isSameName("Joy", "joy")).toBe(true);
    expect(isSameName("JOY ", " joy")).toBe(true);
    expect(isSameName("Joy C.", "joy  c.")).toBe(true);
    expect(isSameName("Joy", "Joy C.")).toBe(false);
    expect(isSameName("Joy", "Joey")).toBe(false);
  });

  it("gives a friendly hint for duplicates", () => {
    expect(duplicateNameHint("  Joy ")).toBe("May Joy na. Dagdagan ng initial ng apelyido mo.");
  });

  it("validates join input", () => {
    expect(joinSchema.safeParse({ slug: "abc123xyz", displayName: "  Joy  " })).toMatchObject({
      success: true,
      data: { slug: "abc123xyz", displayName: "Joy" },
    });
    for (const displayName of ["", "   ", "x".repeat(41), null]) {
      expect(joinSchema.safeParse({ slug: "abc123xyz", displayName }).success, String(displayName)).toBe(false);
    }
    expect(joinSchema.safeParse({ slug: "../bad", displayName: "Joy" }).success).toBe(false);
  });
});
