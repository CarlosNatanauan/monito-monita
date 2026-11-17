import { describe, expect, it } from "vitest";
import { getThemeStatus } from "@/lib/theme-status";
import { addDays } from "@/lib/theme-weeks";
import { CODENAMES } from "@/server/codenames";
import {
  DEMO_DEFAULT_NAME,
  DEMO_EXCLUSION,
  DEMO_MEMBER_COUNT,
  DEMO_PEOPLE,
  demoNameSchema,
  demoPlan,
} from "@/server/demo";
import { isSameName, NAME_MAX } from "@/server/names";
import { wishSchema, WISHLIST_MAX_ITEMS } from "@/server/wishlists";

const TODAY = "2026-11-17";

describe("demoPlan", () => {
  const plan = demoPlan(TODAY, "Migs");

  it("has the visitor and 8 made-up members, a party about a week away", () => {
    expect(plan.visitor).toBe("Migs");
    expect(plan.people).toHaveLength(DEMO_MEMBER_COUNT);
    expect(plan.partyDate).toBe(addDays(TODAY, 8));
    expect(plan.groupName).toBe("Barkada Pasko 2026");
    expect(plan.budget).toBeGreaterThan(0);
  });

  it("has one theme week this week, one over and one next (relative to today)", () => {
    const status = getThemeStatus(plan.themes, plan.partyDate, TODAY);
    expect(status).toMatchObject({ kind: "current", current: plan.themes[1], next: plan.themes[2] });
    expect(plan.themes[0].startDate < TODAY).toBe(true);
    // Any day: still one theme this week (dates follow today, not fixed).
    const day = addDays(TODAY, 30);
    const later = demoPlan(day, "Migs");
    expect(getThemeStatus(later.themes, later.partyDate, day)).toMatchObject({ kind: "current", current: later.themes[1] });
  });

  it("has the sample bawal pair and some members who already opened their slip", () => {
    expect(plan.exclusion).toEqual(DEMO_EXCLUSION);
    expect(plan.opened.length).toBeGreaterThan(0);
    expect(plan.opened.length).toBeLessThan(plan.people.length);
    for (const name of plan.opened) expect(plan.people.map((p) => p.name)).toContain(name);
  });

  it("defaults the visitor to Bisita and cleans the name like a join", () => {
    expect(demoPlan(TODAY, "").visitor).toBe(DEMO_DEFAULT_NAME);
    expect(demoPlan(TODAY, "   ").visitor).toBe(DEMO_DEFAULT_NAME);
    expect(demoPlan(TODAY, "  Ana   Cruz ").visitor).toBe("Ana Cruz");
    expect(demoNameSchema.safeParse(undefined)).toMatchObject({ success: true, data: DEMO_DEFAULT_NAME });
    expect(demoNameSchema.safeParse("x".repeat(NAME_MAX + 1)).success).toBe(false);
  });

  it("never gives a made-up member the visitor's name (the spare takes the place)", () => {
    const same = demoPlan(TODAY, "carlo");
    expect(same.people).toHaveLength(DEMO_MEMBER_COUNT);
    expect(same.people.some((p) => isSameName(p.name, "carlo"))).toBe(false);
    // The visitor is one half of the bawal pair: there is no pair then.
    expect(demoPlan(TODAY, "Ate Joy").exclusion).toBeNull();
    expect(demoPlan(TODAY, "Ate Joy").people).toHaveLength(DEMO_MEMBER_COUNT);
  });
});

describe("DEMO_PEOPLE", () => {
  it("has unique names and wishes that pass the real wishlist validation", () => {
    const names = DEMO_PEOPLE.map((p) => p.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    for (const person of DEMO_PEOPLE) {
      expect(person.wishes.length).toBeGreaterThan(0);
      expect(person.wishes.length).toBeLessThanOrEqual(WISHLIST_MAX_ITEMS);
      for (const wish of person.wishes) expect(wishSchema.safeParse(wish).success).toBe(true);
    }
  });

  it("has enough codenames for everyone", () => {
    expect(CODENAMES.length).toBeGreaterThan(DEMO_PEOPLE.length + 1);
  });
});
