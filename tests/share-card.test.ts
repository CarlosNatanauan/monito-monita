import { describe, expect, it } from "vitest";
import { groupNameSize } from "../components/og/share-card";

describe("groupNameSize", () => {
  it("steps down for long names, never below 52px", () => {
    expect(groupNameSize("Barkada")).toBe(88);
    expect(groupNameSize("Barkada Christmas 2026")).toBe(74);
    expect(groupNameSize("x".repeat(40))).toBe(60);
    expect(groupNameSize("x".repeat(60))).toBe(52);
  });
});
