import { describe, expect, it } from "vitest";
import {
  cryptoRandomInt,
  drawLoop,
  isSingleLoop,
  patchLoopOnRemoval,
  type Assignment,
  type Exclusion,
  type RandomInt,
} from "@/server/draw";

// --- Helpers ---------------------------------------------------------------

/** Deterministic RandomInt (mulberry32) so failures are reproducible. */
function seeded(seed: number): RandomInt {
  let a = seed >>> 0;
  return (max) => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return Math.floor(r * max);
  };
}

const members = (n: number) => Array.from({ length: n }, (_, i) => `m${i}`);

function expectValidLoop(
  assignments: Assignment[],
  ids: string[],
  exclusions: Exclusion[] = [],
) {
  expect(assignments).toHaveLength(ids.length);
  expect(new Set(assignments.map((a) => a.giverId))).toEqual(new Set(ids));
  expect(new Set(assignments.map((a) => a.receiverId))).toEqual(new Set(ids));
  for (const a of assignments) expect(a.giverId).not.toBe(a.receiverId);
  expect(isSingleLoop(assignments, exclusions)).toBe(true);
}

function draw(ids: string[], exclusions: Exclusion[] = [], seed = 1) {
  const result = drawLoop(ids, exclusions, seeded(seed));
  if (!result.ok) throw new Error(`Expected a draw, got ${result.reason}: ${result.message}`);
  return result.assignments;
}

/** Random exclusions: each pair excluded with probability p. */
function randomExclusions(ids: string[], p: number, random: RandomInt): Exclusion[] {
  const out: Exclusion[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      if (random(1_000_000) < p * 1_000_000) out.push([ids[i], ids[j]]);
    }
  }
  return out;
}

/** Ground truth for small groups: does any valid single loop exist? */
function bruteForceHasLoop(ids: string[], exclusions: Exclusion[]): boolean {
  const n = ids.length;
  if (n < 2) return false;
  const banned = new Set(exclusions.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`]));
  const ok = (a: string, b: string) => a !== b && !banned.has(`${a}|${b}`);
  // Fix ids[0] as the start and try every ordering of the rest.
  const rest = ids.slice(1);
  const permute = (path: string[], left: string[]): boolean => {
    const last = path[path.length - 1];
    if (left.length === 0) return ok(last, path[0]);
    return left.some((next, i) =>
      ok(last, next) ? permute([...path, next], [...left.slice(0, i), ...left.slice(i + 1)]) : false,
    );
  };
  return permute([ids[0]], rest);
}

/** Canonical form of a loop so equal loops compare equal. */
function loopKey(assignments: Assignment[]): string {
  const next = new Map(assignments.map((a) => [a.giverId, a.receiverId]));
  const start = [...next.keys()].sort()[0];
  const order = [start];
  for (let c = next.get(start)!; c !== start; c = next.get(c)!) order.push(c);
  return order.join(">");
}

// --- drawLoop ----------------------------------------------------------------

describe("drawLoop", () => {
  it("builds one loop that visits everyone, for many group sizes", () => {
    for (let n = 2; n <= 40; n++) {
      const ids = members(n);
      expectValidLoop(draw(ids, [], n), ids);
    }
  });

  it("never lets anyone draw themselves", () => {
    for (let seed = 0; seed < 200; seed++) {
      const ids = members(2 + (seed % 10));
      for (const a of draw(ids, [], seed)) expect(a.giverId).not.toBe(a.receiverId);
    }
  });

  it("respects exclusions in both directions", () => {
    const ids = members(12);
    // Six couples: m0–m1, m2–m3, ...
    const couples: Exclusion[] = [];
    for (let i = 0; i < 12; i += 2) couples.push([ids[i], ids[i + 1]]);

    for (let seed = 0; seed < 200; seed++) {
      const assignments = draw(ids, couples, seed);
      expectValidLoop(assignments, ids, couples);
      for (const [a, b] of couples) {
        expect(assignments).not.toContainEqual({ giverId: a, receiverId: b });
        expect(assignments).not.toContainEqual({ giverId: b, receiverId: a });
      }
    }
  });

  it("is deterministic for a given seed", () => {
    const ids = members(20);
    expect(draw(ids, [], 42)).toEqual(draw(ids, [], 42));
  });

  it("uses a secure random source by default", () => {
    const ids = members(15);
    const result = drawLoop(ids, [[ids[0], ids[1]]]);
    expect(result.ok).toBe(true);
    if (result.ok) expectValidLoop(result.assignments, ids, [[ids[0], ids[1]]]);
  });

  describe("small groups", () => {
    it("2 people draw each other", () => {
      const assignments = draw(["a", "b"]);
      expect(assignments).toHaveLength(2);
      expect(assignments).toContainEqual({ giverId: "a", receiverId: "b" });
      expect(assignments).toContainEqual({ giverId: "b", receiverId: "a" });
    });

    it("2 people who exclude each other can't draw", () => {
      const result = drawLoop(["a", "b"], [["a", "b"]], seeded(1));
      expect(result).toMatchObject({ ok: false, reason: "IMPOSSIBLE" });
      if (!result.ok) expect(result.blockingExclusions).toEqual([["a", "b"]]);
    });

    it("3 people form a loop", () => {
      for (let seed = 0; seed < 50; seed++) {
        expectValidLoop(draw(["a", "b", "c"], [], seed), ["a", "b", "c"]);
      }
    });

    it("3 people with any exclusion can't draw (everyone touches everyone)", () => {
      const result = drawLoop(["a", "b", "c"], [["a", "b"]], seeded(1));
      expect(result).toMatchObject({ ok: false, reason: "IMPOSSIBLE" });
      if (!result.ok) {
        expect(result.stuckMembers.sort()).toEqual(["a", "b"]);
        expect(result.blockingExclusions).toEqual([["a", "b"]]);
      }
    });

    it("1 person fails", () => {
      expect(drawLoop(["a"], [], seeded(1))).toMatchObject({ ok: false, reason: "TOO_FEW_MEMBERS" });
    });

    it("0 people fails", () => {
      expect(drawLoop([], [], seeded(1))).toMatchObject({ ok: false, reason: "TOO_FEW_MEMBERS" });
    });
  });

  describe("impossible setups", () => {
    it("names the member who is excluded from almost everyone", () => {
      const ids = members(8);
      // m0 may only draw with m1: needs 2 (a giver and a receiver).
      const exclusions: Exclusion[] = ids.slice(2).map((id) => ["m0", id]);
      const result = drawLoop(ids, exclusions, seeded(1));
      expect(result).toMatchObject({ ok: false, reason: "IMPOSSIBLE", stuckMembers: ["m0"] });
      if (!result.ok) expect(result.blockingExclusions).toEqual(exclusions);
    });

    it("detects a group split into separate circles", () => {
      // Two triangles, every cross pair excluded. Everyone still has 2 options.
      const left = ["a", "b", "c"];
      const right = ["x", "y", "z"];
      const cross: Exclusion[] = left.flatMap((l) => right.map((r) => [l, r] as const));
      const result = drawLoop([...left, ...right], cross, seeded(1));
      expect(result).toMatchObject({ ok: false, reason: "IMPOSSIBLE" });
      if (!result.ok) expect(result.blockingExclusions).toHaveLength(9);
    });

    it("proves impossibility by full search when no simple rule applies", () => {
      // Allowed pairs form K(2,4): {a,b} with {w,x,y,z} only. Everyone has
      // 2+ options and the group is connected, but a loop would need to
      // alternate sides, which 2 vs 4 can't do.
      const small = ["a", "b"];
      const big = ["w", "x", "y", "z"];
      const exclusions: Exclusion[] = [
        ["a", "b"],
        ["w", "x"], ["w", "y"], ["w", "z"], ["x", "y"], ["x", "z"], ["y", "z"],
      ];
      const result = drawLoop([...small, ...big], exclusions, seeded(1));
      expect(result).toMatchObject({ ok: false, reason: "IMPOSSIBLE" });
    });

    it("rejects duplicate members", () => {
      expect(drawLoop(["a", "b", "a"], [], seeded(1))).toMatchObject({
        ok: false,
        reason: "INVALID_INPUT",
        stuckMembers: ["a"],
      });
    });

    it("rejects exclusions naming unknown members", () => {
      expect(drawLoop(["a", "b", "c"], [["a", "nope"]], seeded(1))).toMatchObject({
        ok: false,
        reason: "INVALID_INPUT",
      });
    });

    it("ignores self-exclusions", () => {
      expectValidLoop(draw(["a", "b", "c"], [["a", "a"]]), ["a", "b", "c"]);
    });
  });

  it("agrees with brute force on whether a loop exists (random small groups)", () => {
    const random = seeded(2026);
    let possible = 0;
    let impossible = 0;
    for (let trial = 0; trial < 400; trial++) {
      const ids = members(2 + random(7)); // 2..8 members
      const exclusions = randomExclusions(ids, random(70) / 100, random);
      const expected = bruteForceHasLoop(ids, exclusions);
      const result = drawLoop(ids, exclusions, seeded(trial));

      expect(result.ok, `trial ${trial}`).toBe(expected);
      if (result.ok) {
        possible++;
        expectValidLoop(result.assignments, ids, exclusions);
      } else {
        impossible++;
        expect(result.reason).toBe("IMPOSSIBLE");
      }
    }
    // Make sure the test exercised both outcomes.
    expect(possible).toBeGreaterThan(50);
    expect(impossible).toBeGreaterThan(50);
  });

  describe("large groups", () => {
    it("150 members with many exclusions finishes fast", () => {
      const ids = members(150);
      for (const p of [0.1, 0.3, 0.5]) {
        const exclusions = randomExclusions(ids, p, seeded(7));
        const startedAt = performance.now();
        const assignments = draw(ids, exclusions, 7);
        const elapsed = performance.now() - startedAt;
        expectValidLoop(assignments, ids, exclusions);
        expect(elapsed, `p=${p} took ${elapsed.toFixed(0)}ms`).toBeLessThan(1000);
      }
    });

    it("150 members: everyone excludes their partner and 3 siblings", () => {
      const ids = members(150);
      const exclusions: Exclusion[] = [];
      for (let i = 0; i < 150; i += 2) exclusions.push([ids[i], ids[i + 1]]); // couples
      for (let f = 0; f < 150; f += 5) {
        // families of 5
        for (let i = f; i < f + 5; i++) for (let j = i + 1; j < f + 5; j++) exclusions.push([ids[i], ids[j]]);
      }
      const startedAt = performance.now();
      expectValidLoop(draw(ids, exclusions, 3), ids, exclusions);
      expect(performance.now() - startedAt).toBeLessThan(1000);
    });

    it("150 members with an impossible setup fails fast", () => {
      const ids = members(150);
      const exclusions: Exclusion[] = ids.slice(2).map((id) => ["m0", id]);
      const startedAt = performance.now();
      expect(drawLoop(ids, exclusions, seeded(1))).toMatchObject({ ok: false, reason: "IMPOSSIBLE" });
      expect(performance.now() - startedAt).toBeLessThan(1000);
    });
  });

  describe("fairness", () => {
    it("every possible loop of 5 shows up about equally often", () => {
      // 5 people have (5 - 1)! = 24 distinct loops.
      const ids = members(5);
      const counts = new Map<string, number>();
      const runs = 4800;
      const random = seeded(99);
      for (let i = 0; i < runs; i++) {
        const result = drawLoop(ids, [], random);
        if (!result.ok) throw new Error(result.message);
        const key = loopKey(result.assignments);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      expect(counts.size).toBe(24);
      const expected = runs / 24; // 200
      for (const count of counts.values()) {
        expect(count).toBeGreaterThan(expected * 0.7);
        expect(count).toBeLessThan(expected * 1.3);
      }
    });

    it("each person gets a variety of receivers with the default secure random", () => {
      const ids = members(10);
      const receiversOfM0 = new Set<string>();
      const loops = new Set<string>();
      for (let i = 0; i < 300; i++) {
        const result = drawLoop(ids);
        if (!result.ok) throw new Error(result.message);
        receiversOfM0.add(result.assignments.find((a) => a.giverId === "m0")!.receiverId);
        loops.add(loopKey(result.assignments));
      }
      expect(receiversOfM0.size).toBe(9); // everyone except m0 themselves
      expect(loops.size).toBeGreaterThan(290); // 9! = 362,880 possible loops
    });
  });
});

// --- patchLoopOnRemoval ------------------------------------------------------

describe("patchLoopOnRemoval", () => {
  it("gives the removed member's receiver to whoever had them", () => {
    const ids = members(10);
    const before = draw(ids, [], 5);
    const removed = "m3";
    const giver = before.find((a) => a.receiverId === removed)!.giverId;
    const receiver = before.find((a) => a.giverId === removed)!.receiverId;

    const result = patchLoopOnRemoval(before, removed);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expectValidLoop(result.assignments, ids.filter((id) => id !== removed));
    expect(result.assignments).toContainEqual({ giverId: giver, receiverId: receiver });

    // Everyone else keeps their monito.
    for (const a of before) {
      if (a.giverId !== removed && a.giverId !== giver) expect(result.assignments).toContainEqual(a);
    }
  });

  it("stays one valid loop after removing members one by one down to 2", () => {
    const ids = members(12);
    let assignments = draw(ids, [], 8);
    let remaining = [...ids];
    const random = seeded(8);
    while (remaining.length > 2) {
      const removed = remaining[random(remaining.length)];
      const result = patchLoopOnRemoval(assignments, removed);
      if (!result.ok) throw new Error(result.message);
      assignments = result.assignments;
      remaining = remaining.filter((id) => id !== removed);
      expectValidLoop(assignments, remaining);
    }
  });

  it("doesn't mutate the input", () => {
    const before = draw(members(6), [], 2);
    const copy = structuredClone(before);
    patchLoopOnRemoval(before, "m0");
    expect(before).toEqual(copy);
  });

  it("refuses to go below 2 people", () => {
    expect(patchLoopOnRemoval(draw(["a", "b"]), "a")).toMatchObject({ ok: false, reason: "TOO_FEW_MEMBERS" });
  });

  it("refuses a patch that breaks an exclusion", () => {
    // a → b → c → d → a. Removing b means a gets c, but a–c is excluded.
    const loop: Assignment[] = [
      { giverId: "a", receiverId: "b" },
      { giverId: "b", receiverId: "c" },
      { giverId: "c", receiverId: "d" },
      { giverId: "d", receiverId: "a" },
    ];
    expect(patchLoopOnRemoval(loop, "b", [["c", "a"]])).toMatchObject({ ok: false, reason: "EXCLUDED" });
    expect(patchLoopOnRemoval(loop, "b", [["b", "d"]]).ok).toBe(true);
  });

  it("fails clearly for a member who isn't in the draw", () => {
    expect(patchLoopOnRemoval(draw(members(4)), "stranger")).toMatchObject({ ok: false, reason: "NOT_IN_LOOP" });
  });

  it("rejects assignments that aren't one loop", () => {
    // Two separate 2-loops.
    const twoLoops: Assignment[] = [
      { giverId: "a", receiverId: "b" },
      { giverId: "b", receiverId: "a" },
      { giverId: "c", receiverId: "d" },
      { giverId: "d", receiverId: "c" },
    ];
    expect(patchLoopOnRemoval(twoLoops, "a")).toMatchObject({ ok: false, reason: "INVALID_LOOP" });
  });
});

// --- isSingleLoop & cryptoRandomInt -----------------------------------------

describe("isSingleLoop", () => {
  it("rejects self-draws, duplicates, split loops, and broken exclusions", () => {
    expect(isSingleLoop([{ giverId: "a", receiverId: "a" }])).toBe(false);
    expect(
      isSingleLoop([
        { giverId: "a", receiverId: "b" },
        { giverId: "b", receiverId: "a" },
        { giverId: "c", receiverId: "a" },
      ]),
    ).toBe(false);
    const abc: Assignment[] = [
      { giverId: "a", receiverId: "b" },
      { giverId: "b", receiverId: "c" },
      { giverId: "c", receiverId: "a" },
    ];
    expect(isSingleLoop(abc)).toBe(true);
    expect(isSingleLoop(abc, [["b", "a"]])).toBe(false);
  });
});

describe("cryptoRandomInt", () => {
  it("returns integers in range and covers all values", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = cryptoRandomInt(7);
      expect(Number.isInteger(v) && v >= 0 && v < 7).toBe(true);
      seen.add(v);
    }
    expect(seen.size).toBe(7);
  });

  it("rejects invalid bounds", () => {
    expect(() => cryptoRandomInt(0)).toThrow(RangeError);
    expect(() => cryptoRandomInt(1.5)).toThrow(RangeError);
  });
});
