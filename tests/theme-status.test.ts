import { describe, expect, it } from "vitest";
import { daysBetween, getThemeStatus, inDays, themeCard } from "@/lib/theme-status";
import { themeStartDates, todayIn } from "@/lib/theme-weeks";

// Party Sat Dec 19 2026; 4 themes start Nov 21, Nov 28, Dec 5, Dec 12.
const PARTY = "2026-12-19";
const TITLES = ["Something soft", "Something sweet", "Something red", "Something you can use"];
const themes = themeStartDates(PARTY, 4).map((startDate, i) => ({ title: TITLES[i], startDate }));

/** "today" in Manila at a given UTC instant, like the server does. */
const manilaToday = (isoUtc: string) => todayIn("Asia/Manila", new Date(isoUtc));
const statusAt = (isoUtc: string, list = themes) => getThemeStatus(list, PARTY, manilaToday(isoUtc));

describe("getThemeStatus", () => {
  it("before the first theme: says when it starts", () => {
    expect(getThemeStatus(themes, PARTY, "2026-11-10")).toEqual({
      kind: "before",
      first: themes[0],
      daysToStart: 11,
      partyDate: PARTY,
    });
  });

  it("during a theme week: current and what's next", () => {
    expect(getThemeStatus(themes, PARTY, "2026-11-30")).toMatchObject({
      kind: "current",
      current: themes[1],
      next: themes[2],
      daysToParty: 19,
    });
  });

  it("the last theme week: next is the party", () => {
    expect(getThemeStatus(themes, PARTY, "2026-12-18")).toMatchObject({ kind: "current", current: themes[3], next: null });
  });

  it("after the last theme week (before the party): shows the party", () => {
    const early = [{ title: "Something soft", startDate: "2026-11-21" }];
    expect(getThemeStatus(early, PARTY, "2026-11-28")).toEqual({ kind: "after", partyDate: PARTY, daysToParty: 21 });
    expect(getThemeStatus(early, PARTY, "2026-11-27")).toMatchObject({ kind: "current" });
  });

  it("party day and after", () => {
    expect(getThemeStatus(themes, PARTY, PARTY)).toEqual({ kind: "party", partyDate: PARTY, isToday: true });
    expect(getThemeStatus(themes, PARTY, "2026-12-25")).toEqual({ kind: "party", partyDate: PARTY, isToday: false });
  });

  it("no themes", () => {
    expect(getThemeStatus([], PARTY, "2026-12-01")).toEqual({ kind: "none", partyDate: PARTY, daysToParty: 18 });
  });

  it("doesn't depend on the order themes are passed in", () => {
    expect(getThemeStatus([...themes].reverse(), PARTY, "2026-12-06")).toMatchObject({ current: themes[2] });
  });
});

describe("midnight in Manila (the server runs in UTC)", () => {
  it("a theme starts at 00:00 Manila, which is 16:00 UTC the day before", () => {
    // 23:59:59 Nov 20 in Manila → still before the first theme.
    expect(statusAt("2026-11-20T15:59:59Z")).toMatchObject({ kind: "before", daysToStart: 1 });
    // 00:00:00 Nov 21 in Manila → first theme has started (UTC is still Nov 20).
    expect(statusAt("2026-11-20T16:00:00Z")).toMatchObject({ kind: "current", current: themes[0] });
  });

  it("the next theme takes over exactly at Manila midnight", () => {
    expect(statusAt("2026-11-27T15:59:59Z")).toMatchObject({ current: themes[0] });
    expect(statusAt("2026-11-27T16:00:00Z")).toMatchObject({ current: themes[1] });
  });

  it("party day begins at Manila midnight", () => {
    expect(statusAt("2026-12-18T15:59:59Z")).toMatchObject({ kind: "current", current: themes[3] });
    expect(statusAt("2026-12-18T16:00:00Z")).toEqual({ kind: "party", partyDate: PARTY, isToday: true });
  });

  it("using the server's UTC date instead would be a day off", () => {
    const instant = new Date("2026-11-20T16:30:00Z"); // 00:30 Nov 21 in Manila
    const utcDate = instant.toISOString().slice(0, 10); // "2026-11-20"
    expect(getThemeStatus(themes, PARTY, utcDate).kind).toBe("before");
    expect(getThemeStatus(themes, PARTY, todayIn("Asia/Manila", instant)).kind).toBe("current");
  });
});

describe("helpers and copy", () => {
  it("daysBetween and inDays", () => {
    expect(daysBetween("2026-12-31", "2027-01-02")).toBe(2);
    expect(daysBetween("2026-12-19", "2026-12-19")).toBe(0);
    expect(inDays(0)).toBe("ngayon");
    expect(inDays(1)).toBe("bukas");
    expect(inDays(5)).toBe("sa 5 araw");
  });

  it("describes each status in short Taglish", () => {
    expect(themeCard(getThemeStatus(themes, PARTY, "2026-11-30"), themes, 500)).toEqual({
      label: "Ngayong linggo",
      title: "Something sweet",
      detail: "Week 2 of 4 · hanggang ₱500",
    });
    expect(themeCard(getThemeStatus(themes, PARTY, "2026-12-14"), themes, 500).detail).toBe(
      "Week 4 of 4 · hanggang ₱500",
    );
    expect(themeCard(getThemeStatus(themes, PARTY, "2026-11-20"), themes, 500)).toEqual({
      label: "Unang theme",
      title: "Something soft",
      detail: "Simula bukas, Nov 21 · hanggang ₱500",
    });
    expect(themeCard(getThemeStatus([], PARTY, "2026-12-14"), [], 300).detail).toBe("Party sa 5 araw · hanggang ₱300");
    expect(themeCard(getThemeStatus(themes, PARTY, PARTY), themes, 500).title).toBe("Party na!");
  });
});
