import { describe, expect, it } from "vitest";
import { loopOffset, revealSlipsAt, slipIndicesAt, type LoopPair } from "../server/reveal-window";

const loop = (n: number): LoopPair[] =>
  Array.from({ length: n }, (_, i) => ({
    giverCodename: `Code ${i}`,
    giverName: `Name ${i}`,
    receiverName: `Name ${(i + 1) % n}`,
  }));

describe("reveal window", () => {
  it("up to 16: every slip, names only on revealed pairs", () => {
    const slips = revealSlipsAt(loop(12), 7);
    expect(slips.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(slips[6]).toEqual({ index: 6, codename: "Code 6", giverName: "Name 6", receiverName: "Name 7" });
    expect(slips[7]).toEqual({ index: 7, codename: "Code 7" });
    expect(revealSlipsAt(loop(16), 1)).toHaveLength(16);
  });

  it("above 16: 12 around the current pair plus one hidden at each end", () => {
    expect(slipIndicesAt(20, 40)).toEqual([12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]);
    // Wraps around the loop at both ends.
    expect(slipIndicesAt(1, 17)).toEqual([10, 11, 12, 13, 14, 15, 16, 0, 1, 2, 3, 4, 5, 6]);
    expect(slipIndicesAt(30, 30)).toEqual([22, 23, 24, 25, 26, 27, 28, 29, 0, 1, 2, 3, 4, 5]);
  });

  it("never sends a name from a pair that isn't revealed yet", () => {
    for (const n of [3, 12, 16, 17, 30, 150]) {
      for (let step = 1; step <= n; step++) {
        for (const slip of revealSlipsAt(loop(n), step)) {
          expect(Boolean(slip.giverName), `n=${n} step=${step} slip=${slip.index}`).toBe(slip.index < step);
        }
      }
    }
  });

  it("loopOffset gives window offsets across the loop's seam", () => {
    expect(loopOffset(25, 19, 40)).toBe(6);
    expect(loopOffset(12, 19, 40)).toBe(-7);
    expect(loopOffset(39, 0, 40)).toBe(-1);
    expect(loopOffset(0, 39, 40)).toBe(1);
    expect(loopOffset(5, 0, 40)).toBe(5);
  });
});
