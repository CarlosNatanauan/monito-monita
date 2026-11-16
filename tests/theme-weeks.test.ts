import { describe, expect, it } from "vitest";
import { pastWeeksWarning, themeStartDates, themeWeekStates } from "@/lib/theme-weeks";

describe("themeWeekStates (persona test C4, M11)", () => {
  it("HR Joy's case: party Dec 12, 5 weeks, today Nov 16 → Week 1 is over, Week 2 is this week", () => {
    const starts = themeStartDates("2026-12-12", 5);
    expect(starts).toEqual(["2026-11-07", "2026-11-14", "2026-11-21", "2026-11-28", "2026-12-05"]);
    expect(themeWeekStates(starts, "2026-11-16")).toEqual(["past", "current", "upcoming", "upcoming", "upcoming"]);
  });

  it("a week runs until the next one starts; the last one for 7 days", () => {
    const starts = ["2026-11-21", "2026-11-28"];
    expect(themeWeekStates(starts, "2026-11-20")).toEqual(["upcoming", "upcoming"]);
    expect(themeWeekStates(starts, "2026-11-21")).toEqual(["current", "upcoming"]);
    expect(themeWeekStates(starts, "2026-11-27")).toEqual(["current", "upcoming"]);
    expect(themeWeekStates(starts, "2026-11-28")).toEqual(["past", "current"]);
    expect(themeWeekStates(starts, "2026-12-05")).toEqual(["past", "past"]);
    expect(themeWeekStates([], "2026-12-05")).toEqual([]);
  });
});

describe("pastWeeksWarning (persona test C4)", () => {
  it("says how many themes nobody will see, and what to do", () => {
    expect(pastWeeksWarning(["past", "current", "upcoming"])).toBe(
      "1 theme ang tapos na bago pa magsimula, kaya walang makakakita. Bawasan ang weeks para magsimula sa linggong ito.",
    );
    expect(pastWeeksWarning(["past", "past", "current"])).toMatch(/^2 themes ang tapos na/);
  });

  it("is quiet when every week is still ahead or running", () => {
    expect(pastWeeksWarning(["current", "upcoming"])).toBeNull();
    expect(pastWeeksWarning([])).toBeNull();
  });
});
