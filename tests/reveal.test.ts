import { describe, expect, it } from "vitest";
import { moveStep, revealOrder } from "@/server/reveal";

const pair = (giverId: string, receiverId: string) => ({ giverId, receiverId });

describe("revealOrder", () => {
  it("follows the loop from the first giver in join order", () => {
    // Loop A → C → B → D → A, stored in random order.
    const pairs = [pair("B", "D"), pair("D", "A"), pair("A", "C"), pair("C", "B")];
    expect(revealOrder(pairs, ["A", "B", "C", "D"]).map((p) => p.giverId)).toEqual(["A", "C", "B", "D"]);
    expect(revealOrder(pairs, ["D", "A", "B", "C"]).map((p) => p.giverId)).toEqual(["D", "A", "C", "B"]);
  });

  it("each receiver is the next giver (the chain the party follows)", () => {
    const pairs = [pair("1", "2"), pair("2", "3"), pair("3", "4"), pair("4", "5"), pair("5", "1")];
    const ordered = revealOrder(pairs, ["3", "1", "2", "4", "5"]);
    for (let i = 0; i < ordered.length - 1; i++) expect(ordered[i].receiverId).toBe(ordered[i + 1].giverId);
    expect(ordered.at(-1)!.receiverId).toBe(ordered[0].giverId);
  });

  it("still shows every pair exactly once if the pairs aren't one loop", () => {
    const pairs = [pair("A", "B"), pair("B", "A"), pair("C", "D"), pair("D", "C")];
    const ordered = revealOrder(pairs, ["C", "A", "B", "D"]);
    expect(ordered.map((p) => p.giverId)).toEqual(["C", "D", "A", "B"]);
  });

  it("keeps extra fields and handles an unknown or empty order", () => {
    const pairs = [{ ...pair("A", "B"), name: "x" }, { ...pair("B", "A"), name: "y" }];
    expect(revealOrder(pairs, [])).toEqual(pairs);
    expect(revealOrder([], ["A"])).toEqual([]);
  });
});

describe("moveStep", () => {
  it("Next moves forward and finishes on the last pair", () => {
    expect(moveStep(1, 3, "next")).toEqual({ step: 2, finished: false });
    expect(moveStep(2, 3, "next")).toEqual({ step: 3, finished: false });
    expect(moveStep(3, 3, "next")).toEqual({ step: 3, finished: true });
  });

  it("Previous moves back but never before the first pair", () => {
    expect(moveStep(3, 3, "previous")).toEqual({ step: 2, finished: false });
    expect(moveStep(1, 3, "previous")).toEqual({ step: 1, finished: false });
  });
});
