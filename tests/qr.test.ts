import { encode } from "uqr";
import { describe, expect, it } from "vitest";
import { qrPath } from "@/lib/qr";

const LINK = `https://monitomonita-ph.vercel.app/g/k3x9m2p4q7rt/admin?t=${"A1b2-C3d4_".repeat(4)}xyz`;

/** Paints the path's module squares back onto a grid. */
function paint(d: string, size: number): boolean[][] {
  const grid = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  for (const [, x, y, run] of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-\3z/g)) {
    for (let i = 0; i < Number(run); i++) grid[Number(y)][Number(x) + i] = true;
  }
  return grid;
}

describe("qrPath", () => {
  it("draws exactly the dark modules of the code", () => {
    const { size, d } = qrPath(LINK);
    const expected = encode(LINK, { ecc: "L", border: 0 });
    expect(size).toBe(expected.size);
    expect(paint(d, size)).toEqual(expected.data);
    // Only move/line commands in module units: safe to put in an SVG.
    expect(d).toMatch(/^(M\d+ \d+h\d+v1h-\d+z)+$/);
  });

  it("keeps an organizer link small enough for big modules (version 5, 37×37)", () => {
    expect(qrPath(LINK).size).toBe(37);
  });
});
