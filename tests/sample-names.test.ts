import { describe, expect, it } from "vitest";
import { FIRST_SAMPLE, nextSample, SAMPLE_NAMES } from "../lib/sample-names";

describe("nextSample", () => {
  it("starts with the mockup's name", () => {
    expect(nextSample(null)).toBe(FIRST_SAMPLE);
  });

  it("never repeats the name just shown", () => {
    for (const previous of SAMPLE_NAMES) {
      for (const r of [0, 0.25, 0.5, 0.999999]) {
        const next = nextSample(previous, () => r);
        expect(next).not.toBe(previous);
        expect(SAMPLE_NAMES).toContain(next);
      }
    }
  });

  it("names fit on the slip (short, no tildes)", () => {
    for (const name of SAMPLE_NAMES) {
      expect(name.length).toBeLessThanOrEqual(12);
      expect(name).not.toContain("~");
    }
  });
});
