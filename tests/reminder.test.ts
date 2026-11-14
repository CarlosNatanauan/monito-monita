import { describe, expect, it } from "vitest";
import { buildGcReminder, mostHaveOpened, type ReminderInput } from "@/lib/reminder";
import { getThemeStatus } from "@/lib/theme-status";
import { themeStartDates } from "@/lib/theme-weeks";

const PARTY = "2026-12-19";
const themes = themeStartDates(PARTY, 2).map((startDate, i) => ({ title: ["Something soft", "Something sweet"][i], startDate }));
const base: ReminderInput = {
  groupName: "Barkada Party",
  status: "OPEN",
  shareUrl: "https://monitomonita-ph.vercel.app/g/abc123xyz789",
  memberCount: 7,
  partyDate: PARTY,
  budget: 500,
  theme: getThemeStatus(themes, PARTY, "2026-11-10"),
};

describe("buildGcReminder", () => {
  it("before the draw: invites people with the link, count, and party date", () => {
    expect(buildGcReminder(base)).toBe(
      [
        "🎁 Monito Monita: Barkada Party",
        "",
        "Sali na sa exchange gift natin! 🎄",
        "👉 https://monitomonita-ph.vercel.app/g/abc123xyz789",
        "",
        "7 na ang sumali. Party: Sat, Dec 19, 2026 🎉",
        "Budget: ₱500",
      ].join("\n"),
    );
    expect(buildGcReminder({ ...base, memberCount: 0 })).toContain("Wala pang sumali, ikaw na ang una!");
  });

  it("after the draw: this week's theme, budget, party, and a wishlist nudge", () => {
    const message = buildGcReminder({ ...base, status: "DRAWN", theme: getThemeStatus(themes, PARTY, "2026-12-08") });
    expect(message).toBe(
      [
        "🎁 Barkada Party reminder!",
        "",
        "✨ Ngayong linggo: Something soft",
        "💸 Budget: ₱500",
        "🎉 Party: Sat, Dec 19, 2026",
        "",
        "Na-update n'yo na ba ang wishlist n'yo? Buksan ang personal link n'yo para hindi mahirapan ang monito n'yo 😉",
      ].join("\n"),
    );
    // No share link once joining is closed.
    expect(message).not.toContain("https://");
  });

  it("after the draw, adapts to where the themes are", () => {
    const drawn = { ...base, status: "DRAWN" as const };
    expect(buildGcReminder({ ...drawn, theme: getThemeStatus(themes, PARTY, "2026-11-10") })).toContain(
      "✨ Unang theme: Something soft, simula Sat, Dec 5, 2026",
    );
    expect(buildGcReminder({ ...drawn, theme: getThemeStatus(themes, PARTY, PARTY) })).toContain("🎉 Party na ngayon!");
    expect(buildGcReminder({ ...drawn, theme: getThemeStatus([], PARTY, "2026-12-01") })).not.toContain("✨");
  });

  it("right after the draw: tells everyone to open their link, with party and budget", () => {
    const message = buildGcReminder({ ...base, status: "DRAWN", kind: "drawn" });
    expect(message).toBe(
      [
        "🎁 Barkada Party",
        "",
        "Na-draw na! Buksan ang link mo para makita ang monito mo 🎁",
        "",
        "🎉 Party: Sat, Dec 19, 2026",
        "💸 Budget: ₱500",
      ].join("\n"),
    );
  });
});

describe("mostHaveOpened", () => {
  it("is true only when more than half have opened their slip", () => {
    expect(mostHaveOpened({ opened: 0, total: 0 })).toBe(false);
    expect(mostHaveOpened({ opened: 0, total: 4 })).toBe(false);
    expect(mostHaveOpened({ opened: 2, total: 4 })).toBe(false);
    expect(mostHaveOpened({ opened: 3, total: 4 })).toBe(true);
    expect(mostHaveOpened({ opened: 8, total: 12 })).toBe(true);
  });
});
