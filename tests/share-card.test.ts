import { describe, expect, it } from "vitest";
import { groupNameSize } from "../components/og/share-card";

describe("groupNameSize", () => {
  it("steps down for long names, never below 56px", () => {
    expect(groupNameSize("Barkada")).toBe(96);
    expect(groupNameSize("Barkada Christmas 2026")).toBe(80);
    expect(groupNameSize("x".repeat(40))).toBe(66);
    expect(groupNameSize("x".repeat(60))).toBe(56);
  });
});
