import { describe, expect, it } from "vitest";
import { bulbRows, bulbScale, joinStates, litBulbs, MAX_BULBS, MAX_PER_ROW, openedStates } from "../lib/lights";

const count = (states: string[], s: string) => states.filter((x) => x === s).length;

describe("bulbScale", () => {
  it("one bulb per member up to the maximum", () => {
    expect(bulbScale(0)).toEqual({ bulbs: 0, perBulb: 1 });
    expect(bulbScale(3)).toEqual({ bulbs: 3, perBulb: 1 });
    expect(bulbScale(12)).toEqual({ bulbs: 12, perBulb: 1 });
    expect(bulbScale(24)).toEqual({ bulbs: 24, perBulb: 1 });
  });

  it("above the maximum each bulb stands for a share", () => {
    expect(bulbScale(25)).toEqual({ bulbs: 13, perBulb: 2 });
    expect(bulbScale(40)).toEqual({ bulbs: 20, perBulb: 2 });
    expect(bulbScale(150)).toEqual({ bulbs: 22, perBulb: 7 });
  });

  it("never draws more than the maximum, and covers every member", () => {
    for (let n = 1; n <= 500; n++) {
      const { bulbs, perBulb } = bulbScale(n);
      expect(bulbs).toBeLessThanOrEqual(MAX_BULBS);
      expect(bulbs * perBulb).toBeGreaterThanOrEqual(n);
      expect((bulbs - 1) * perBulb).toBeLessThan(n);
    }
  });
});

describe("litBulbs", () => {
  it("lights at least one once someone is done, and all only when everyone is", () => {
    expect(litBulbs(0, 150, 22)).toBe(0);
    expect(litBulbs(1, 150, 22)).toBe(1);
    expect(litBulbs(149, 150, 22)).toBe(21);
    expect(litBulbs(150, 150, 22)).toBe(22);
    expect(litBulbs(75, 150, 22)).toBe(11);
  });

  it("is exact with one bulb per member", () => {
    for (let done = 0; done <= 12; done++) expect(litBulbs(done, 12, 12)).toBe(done);
  });
});

describe("joinStates / openedStates", () => {
  it("join: all on, the newest glows", () => {
    const plan = joinStates(9);
    expect(plan.perBulb).toBe(1);
    expect(plan.states).toHaveLength(9);
    expect(plan.states.at(-1)).toBe("glow");
    expect(count(plan.states, "on")).toBe(8);
  });

  it("join with 150 members: 22 bulbs of 7", () => {
    const plan = joinStates(150);
    expect(plan).toMatchObject({ perBulb: 7 });
    expect(plan.states).toHaveLength(22);
    expect(count(plan.states, "glow")).toBe(1);
  });

  it("opened: on, glow at the most recent, then off", () => {
    expect(openedStates(8, 12).states).toEqual([...Array(7).fill("on"), "glow", ...Array(4).fill("off")]);
    expect(openedStates(0, 3).states).toEqual(["off", "off", "off"]);
    const big = openedStates(20, 40);
    expect(big.perBulb).toBe(2);
    expect(count(big.states, "on") + count(big.states, "glow")).toBe(10);
  });

  it("no members, no bulbs", () => {
    expect(joinStates(0).states).toEqual([]);
    expect(openedStates(0, 0).states).toEqual([]);
  });
});

describe("bulbRows", () => {
  const n = (k: number) => Array.from({ length: k }, (_, i) => i);
  const sizes = (k: number) => bulbRows(n(k)).map((r) => r.length);

  it("keeps up to a full row on one wire", () => {
    expect(sizes(3)).toEqual([3]);
    expect(sizes(MAX_PER_ROW)).toEqual([12]);
  });

  it("wraps into even rows", () => {
    expect(sizes(13)).toEqual([7, 6]);
    expect(sizes(20)).toEqual([10, 10]);
    expect(sizes(22)).toEqual([11, 11]);
    expect(sizes(24)).toEqual([12, 12]);
  });

  it("keeps order and every item", () => {
    expect(bulbRows(n(23)).flat()).toEqual(n(23));
    expect(bulbRows([])).toEqual([]);
  });
});
