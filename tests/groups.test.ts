import { describe, expect, it } from "vitest";
import { isValidSlug } from "@/server/auth";
import { createGroupFormValues, createSlug, SLUG_LENGTH, validateCreateGroup } from "@/server/groups";
import {
  addDays,
  formatShortDate,
  isIsoDate,
  SAMPLE_THEMES,
  themeStartDates,
  todayIn,
} from "@/lib/theme-weeks";

const TODAY = "2026-11-09";
const valid = {
  name: "Barkada Christmas Party",
  budget: "500",
  partyDate: "2026-12-19",
  themes: [...SAMPLE_THEMES],
};

describe("theme week dates", () => {
  it("counts back weekly from the party, ending the week before", () => {
    expect(themeStartDates("2026-12-19", 4)).toEqual(["2026-11-21", "2026-11-28", "2026-12-05", "2026-12-12"]);
    expect(themeStartDates("2026-12-19", 1)).toEqual(["2026-12-12"]);
    expect(themeStartDates("2026-12-19", 0)).toEqual([]);
  });

  it("crosses month and year boundaries", () => {
    expect(themeStartDates("2027-01-03", 2)).toEqual(["2026-12-20", "2026-12-27"]);
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29"); // leap year
  });

  it("validates real calendar dates", () => {
    expect(isIsoDate("2026-12-19")).toBe(true);
    for (const bad of ["2026-02-30", "2026-13-01", "26-12-19", "2026-12-19T00:00", "", null, 20261219]) {
      expect(isIsoDate(bad)).toBe(false);
    }
  });

  it("computes today in Manila, not UTC", () => {
    // 2026-11-09 20:00 UTC is already Nov 10 in Manila (UTC+8).
    expect(todayIn("Asia/Manila", new Date("2026-11-09T20:00:00Z"))).toBe("2026-11-10");
    expect(todayIn("Asia/Manila", new Date("2026-11-09T10:00:00Z"))).toBe("2026-11-09");
  });

  it("formats short dates", () => {
    expect(formatShortDate("2026-11-28")).toBe("Nov 28");
    expect(formatShortDate("2027-01-03", true)).toBe("Jan 3, 2027");
    expect(formatShortDate("nope")).toBe("");
  });
});

describe("createSlug", () => {
  it("is 12 unambiguous lowercase characters that pass slug validation", () => {
    for (let i = 0; i < 200; i++) {
      const slug = createSlug();
      expect(slug).toHaveLength(SLUG_LENGTH);
      expect(slug).toMatch(/^[a-km-np-z2-9]+$/); // no l, o, 0, 1
      expect(isValidSlug(slug)).toBe(true);
    }
  });

  it("doesn't repeat", () => {
    expect(new Set(Array.from({ length: 2000 }, createSlug)).size).toBe(2000);
  });
});

describe("validateCreateGroup", () => {
  it("accepts a valid group and normalizes values", () => {
    const result = validateCreateGroup({ ...valid, name: "  Barkada  ", themes: [" Something soft "] }, TODAY);
    expect(result).toEqual({
      ok: true,
      data: { name: "Barkada", budget: 500, partyDate: "2026-12-19", themes: ["Something soft"] },
    });
  });

  it("allows zero themes and a party today", () => {
    expect(validateCreateGroup({ ...valid, themes: [], partyDate: TODAY }, TODAY).ok).toBe(true);
  });

  it("requires a name", () => {
    expect(validateCreateGroup({ ...valid, name: "   " }, TODAY)).toEqual({
      ok: false,
      fieldErrors: { name: "Pakilagay ang pangalan ng group." },
    });
    expect(validateCreateGroup({ ...valid, name: null }, TODAY).ok).toBe(false);
  });

  it("limits text lengths", () => {
    expect(validateCreateGroup({ ...valid, name: "x".repeat(61) }, TODAY).ok).toBe(false);
    expect(validateCreateGroup({ ...valid, themes: ["x".repeat(61)] }, TODAY).ok).toBe(false);
  });

  it("checks the budget", () => {
    for (const budget of ["", "0", "-5", "12.50", "abc", "100001"]) {
      const result = validateCreateGroup({ ...valid, budget }, TODAY);
      expect(result.ok, `budget ${JSON.stringify(budget)}`).toBe(false);
      if (!result.ok) expect(result.fieldErrors.budget).toBeDefined();
    }
    expect(validateCreateGroup({ ...valid, budget: "100000" }, TODAY).ok).toBe(true);
  });

  it("rejects past, invalid, or far-future party dates", () => {
    for (const partyDate of ["2026-11-08", "2026-02-30", "", "next friday", "2027-11-11"]) {
      const result = validateCreateGroup({ ...valid, partyDate }, TODAY);
      expect(result.ok, partyDate).toBe(false);
      if (!result.ok) expect(result.fieldErrors.partyDate).toBeDefined();
    }
  });

  it("points theme errors at the right theme", () => {
    const result = validateCreateGroup({ ...valid, themes: ["Something soft", "  ", "Something red"] }, TODAY);
    expect(result).toEqual({ ok: false, fieldErrors: { "themes.1": "Hindi puwedeng blangko ang theme." } });
  });

  it("caps the number of themes", () => {
    const result = validateCreateGroup({ ...valid, themes: Array.from({ length: 9 }, (_, i) => `Theme ${i}`) }, TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.themes).toBeDefined();
  });

  it("ignores extra fields a client might send (no client-chosen dates or tokens)", () => {
    const result = validateCreateGroup({ ...valid, startDates: ["2020-01-01"], organizerTokenHash: "x" }, TODAY);
    expect(result.ok).toBe(true);
    if (result.ok) expect(Object.keys(result.data).sort()).toEqual(["budget", "name", "partyDate", "themes"]);
  });
});

describe("createGroupFormValues", () => {
  it("reads repeated theme fields in order", () => {
    const form = new FormData();
    form.set("name", "Barkada");
    form.set("budget", "300");
    form.set("partyDate", "2026-12-19");
    form.append("theme", "Something soft");
    form.append("theme", "Something sweet");
    expect(createGroupFormValues(form)).toEqual({
      name: "Barkada",
      budget: "300",
      partyDate: "2026-12-19",
      themes: ["Something soft", "Something sweet"],
    });
  });
});
