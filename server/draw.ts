/**
 * The draw: builds one big gift loop (A → B → C → … → A).
 *
 * Pure functions, no database or I/O. The only side effect is reading
 * randomness, and that is injectable so tests can pass a seeded source.
 *
 * Rules:
 * - Everyone gives exactly once and receives exactly once.
 * - Nobody draws themselves.
 * - Exclusions work in both directions (if A–B is excluded, A can't draw B
 *   and B can't draw A).
 * - The result is a single loop, so the reveal can go person to person.
 */

export type MemberId = string;

/** A pair of members who can't draw each other (in either direction). */
export type Exclusion = readonly [MemberId, MemberId];

export interface Assignment {
  giverId: MemberId;
  receiverId: MemberId;
}

/** Returns a uniformly random integer in [0, maxExclusive). */
export type RandomInt = (maxExclusive: number) => number;

export type DrawFailureReason =
  | "INVALID_INPUT" // duplicate members, exclusions naming unknown members
  | "TOO_FEW_MEMBERS" // fewer than 2 members
  | "IMPOSSIBLE" // proven: no valid loop exists
  | "SEARCH_LIMIT"; // gave up searching; very likely too many exclusions

export interface DrawFailure {
  ok: false;
  reason: DrawFailureReason;
  message: string;
  /** Members who can't be placed, when that can be determined. */
  stuckMembers: MemberId[];
  /** Exclusions to relax to make the draw possible, when known. */
  blockingExclusions: Exclusion[];
}

export type DrawResult =
  | { ok: true; assignments: Assignment[] }
  | DrawFailure;

export type PatchFailureReason =
  | "INVALID_LOOP"
  | "NOT_IN_LOOP"
  | "TOO_FEW_MEMBERS"
  | "EXCLUDED";

export type PatchResult =
  | { ok: true; assignments: Assignment[] }
  | { ok: false; reason: PatchFailureReason; message: string };

/** Cryptographically secure RandomInt (Web Crypto; works in Node and Edge). */
export const cryptoRandomInt: RandomInt = (maxExclusive) => {
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > 2 ** 32) {
    throw new RangeError(`maxExclusive must be an integer in [1, 2^32], got ${maxExclusive}`);
  }
  // Rejection sampling avoids modulo bias.
  const limit = Math.floor(2 ** 32 / maxExclusive) * maxExclusive;
  const buf = new Uint32Array(1);
  do {
    globalThis.crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return buf[0] % maxExclusive;
};

// Search budget. Normal groups (≤150 members, couples/siblings excluded)
// finish in well under 1,000 steps; these limits only matter for
// pathological exclusion setups.
const STEPS_PER_ATTEMPT = 50_000;
const RANDOM_ATTEMPTS = 4;
const GUIDED_ATTEMPTS = 4;

/**
 * Draws one big loop. Returns a failure value (never throws) when the
 * input is invalid or no loop can be found.
 */
export function drawLoop(
  memberIds: readonly MemberId[],
  exclusions: readonly Exclusion[] = [],
  random: RandomInt = cryptoRandomInt,
): DrawResult {
  const n = memberIds.length;

  // --- Validate input ---------------------------------------------------
  const index = new Map<MemberId, number>();
  for (const id of memberIds) {
    if (index.has(id)) {
      return fail("INVALID_INPUT", `Member ${id} is listed twice.`, [id]);
    }
    index.set(id, index.size);
  }

  if (n < 2) {
    return fail("TOO_FEW_MEMBERS", "A draw needs at least 2 members.");
  }

  // allowed[a * n + b] === 1 means a may draw b (symmetric).
  const allowed = new Uint8Array(n * n).fill(1);
  for (let i = 0; i < n; i++) allowed[i * n + i] = 0;

  const validExclusions: { pair: Exclusion; a: number; b: number }[] = [];
  for (const pair of exclusions) {
    const a = index.get(pair[0]);
    const b = index.get(pair[1]);
    if (a === undefined || b === undefined) {
      const unknown = a === undefined ? pair[0] : pair[1];
      return fail("INVALID_INPUT", `Exclusion names unknown member ${unknown}.`, [unknown]);
    }
    if (a === b) continue; // self-exclusion is already implied
    allowed[a * n + b] = 0;
    allowed[b * n + a] = 0;
    validExclusions.push({ pair, a, b });
  }

  const degree = new Array<number>(n).fill(0);
  for (let a = 0; a < n; a++) {
    for (let b = 0; b < n; b++) degree[a] += allowed[a * n + b];
  }

  // --- Cheap impossibility proofs ---------------------------------------
  // In a loop of 3+, everyone needs 2 different people they're allowed
  // with (one giver, one receiver). In a loop of 2, just 1.
  const needed = n === 2 ? 1 : 2;
  const stuck: number[] = [];
  for (let i = 0; i < n; i++) if (degree[i] < needed) stuck.push(i);
  if (stuck.length > 0) {
    const stuckSet = new Set(stuck);
    const names = stuck.map((i) => memberIds[i]);
    return fail(
      "IMPOSSIBLE",
      `Too many exclusions for ${names.join(", ")}: each person needs at least ${needed} ${needed === 1 ? "person" : "people"} they're allowed to draw with.`,
      names,
      validExclusions.filter((e) => stuckSet.has(e.a) || stuckSet.has(e.b)).map((e) => e.pair),
    );
  }

  // If exclusions split the group into separate circles, no single loop
  // can connect them.
  const component = components(n, allowed);
  if (component.count > 1) {
    return fail(
      "IMPOSSIBLE",
      "The exclusions split the group into separate circles that can't connect. Remove some exclusions between them.",
      [],
      validExclusions.filter((e) => component.of[e.a] !== component.of[e.b]).map((e) => e.pair),
    );
  }

  if (n === 2) {
    return { ok: true, assignments: toAssignments([0, 1], memberIds) };
  }

  // --- Randomized backtracking ------------------------------------------
  // First a few attempts with purely random candidate order (fairest),
  // then a few guided by "fewest options first" for heavily excluded groups.
  const attempts = RANDOM_ATTEMPTS + GUIDED_ATTEMPTS;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const guided = attempt >= RANDOM_ATTEMPTS;
    const result = searchLoop(n, allowed, degree, random(n), random, guided);
    if (result.kind === "found") {
      return { ok: true, assignments: toAssignments(result.path, memberIds) };
    }
    if (result.kind === "exhausted") {
      // A full search from one start found nothing. Every loop passes
      // through every member, so no loop exists at all.
      return fail(
        "IMPOSSIBLE",
        "No valid draw exists with these exclusions. Try removing a few.",
      );
    }
  }

  return fail(
    "SEARCH_LIMIT",
    "Couldn't find a valid draw. There are probably too many exclusions; try removing a few.",
  );
}

/**
 * Removes a member from an existing loop: whoever had them now gets the
 * removed member's receiver. Everyone else keeps their monito.
 *
 * Pass the group's exclusions to make sure the patched pair is allowed.
 */
export function patchLoopOnRemoval(
  assignments: readonly Assignment[],
  removedMemberId: MemberId,
  exclusions: readonly Exclusion[] = [],
): PatchResult {
  if (!isSingleLoop(assignments)) {
    return { ok: false, reason: "INVALID_LOOP", message: "The current assignments aren't one valid loop." };
  }

  const removed = assignments.find((a) => a.giverId === removedMemberId);
  const giver = assignments.find((a) => a.receiverId === removedMemberId);
  if (!removed || !giver) {
    return { ok: false, reason: "NOT_IN_LOOP", message: `Member ${removedMemberId} isn't in this draw.` };
  }

  if (assignments.length <= 2) {
    return {
      ok: false,
      reason: "TOO_FEW_MEMBERS",
      message: "Removing this member would leave fewer than 2 people.",
    };
  }

  const newGiver = giver.giverId;
  const newReceiver = removed.receiverId;
  const excluded = exclusions.some(
    ([a, b]) => (a === newGiver && b === newReceiver) || (a === newReceiver && b === newGiver),
  );
  if (excluded) {
    return {
      ok: false,
      reason: "EXCLUDED",
      message: `${newGiver} can't draw ${newReceiver} because of an exclusion. A redraw is needed.`,
    };
  }

  return {
    ok: true,
    assignments: assignments
      .filter((a) => a.giverId !== removedMemberId)
      .map((a) => (a.giverId === newGiver ? { giverId: newGiver, receiverId: newReceiver } : { ...a })),
  };
}

/**
 * True when the assignments form exactly one loop: everyone gives once,
 * receives once, nobody draws themselves, and exclusions are respected.
 */
export function isSingleLoop(
  assignments: readonly Assignment[],
  exclusions: readonly Exclusion[] = [],
): boolean {
  const n = assignments.length;
  if (n < 2) return false;

  const next = new Map<MemberId, MemberId>();
  const receivers = new Set<MemberId>();
  for (const { giverId, receiverId } of assignments) {
    if (giverId === receiverId || next.has(giverId) || receivers.has(receiverId)) return false;
    next.set(giverId, receiverId);
    receivers.add(receiverId);
  }
  for (const r of receivers) if (!next.has(r)) return false;

  for (const [a, b] of exclusions) {
    if (next.get(a) === b || next.get(b) === a) return false;
  }

  // Walk the loop from any member; it must visit everyone before returning.
  const start = assignments[0].giverId;
  let current = start;
  for (let steps = 1; steps <= n; steps++) {
    current = next.get(current)!;
    if (current === start) return steps === n;
  }
  return false;
}

// --- Internals ----------------------------------------------------------

function fail(
  reason: DrawFailureReason,
  message: string,
  stuckMembers: MemberId[] = [],
  blockingExclusions: Exclusion[] = [],
): DrawFailure {
  return { ok: false, reason, message, stuckMembers, blockingExclusions };
}

function toAssignments(path: readonly number[], memberIds: readonly MemberId[]): Assignment[] {
  return path.map((m, i) => ({
    giverId: memberIds[m],
    receiverId: memberIds[path[(i + 1) % path.length]],
  }));
}

function shuffle<T>(items: T[], random: RandomInt): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function components(n: number, allowed: Uint8Array): { count: number; of: number[] } {
  const of = new Array<number>(n).fill(-1);
  let count = 0;
  for (let s = 0; s < n; s++) {
    if (of[s] !== -1) continue;
    const stack = [s];
    of[s] = count;
    while (stack.length > 0) {
      const v = stack.pop()!;
      for (let w = 0; w < n; w++) {
        if (allowed[v * n + w] && of[w] === -1) {
          of[w] = count;
          stack.push(w);
        }
      }
    }
    count++;
  }
  return { count, of };
}

type SearchResult =
  | { kind: "found"; path: number[] }
  | { kind: "exhausted" } // searched everything from this start: no loop
  | { kind: "budget" }; // ran out of steps

/**
 * Depth-first search for a Hamiltonian cycle, with random candidate order
 * and forward checking.
 *
 * "Open" members are the ones still unplaced, plus the start and the
 * current end of the path. Every unplaced member needs at least 2 allowed
 * open neighbors (one to receive from, one to give to), except the one
 * placed next, which needs 1. Branches that break this are cut early.
 */
function searchLoop(
  n: number,
  allowed: Uint8Array,
  degree: readonly number[],
  start: number,
  random: RandomInt,
  guided: boolean,
): SearchResult {
  const visited = new Uint8Array(n);
  const openNeighbors = degree.slice(); // all members start open
  const path: number[] = [start];
  visited[start] = 1;
  let steps = 0;
  let outOfBudget = false;

  const extend = (current: number): boolean => {
    if (path.length === n) return allowed[current * n + start] === 1;
    if (++steps > STEPS_PER_ATTEMPT) {
      outOfBudget = true;
      return false;
    }

    // Moving on from `current` makes it interior (closed), unless it's
    // the start, which must stay open to close the loop.
    const closing = current !== start;
    // Unplaced neighbors of `current` left with < 2 open neighbors. Such a
    // member can only survive by being placed right now (its giver is then
    // `current`, so it needs just 1 more: a receiver).
    let critical = -1;
    let dead = false;
    if (closing) {
      for (let v = 0; v < n; v++) {
        if (allowed[current * n + v]) {
          openNeighbors[v]--;
          if (!visited[v] && openNeighbors[v] < 2) {
            if (openNeighbors[v] < 1 || critical !== -1) dead = true;
            critical = v;
          }
        }
      }
    }

    if (!dead) {
      const candidates: number[] = [];
      if (critical !== -1) {
        candidates.push(critical);
      } else {
        for (let v = 0; v < n; v++) {
          if (!visited[v] && allowed[current * n + v]) candidates.push(v);
        }
      }
      shuffle(candidates, random);
      if (guided) {
        // Fewest options first; the shuffle above breaks ties randomly.
        candidates.sort((a, b) => openNeighbors[a] - openNeighbors[b]);
      }

      for (const next of candidates) {
        visited[next] = 1;
        path.push(next);
        if (extend(next)) return true;
        path.pop();
        visited[next] = 0;
        if (outOfBudget) break;
      }
    }

    if (closing) {
      for (let v = 0; v < n; v++) {
        if (allowed[current * n + v]) openNeighbors[v]++;
      }
    }
    return false;
  };

  if (extend(start)) return { kind: "found", path };
  return outOfBudget ? { kind: "budget" } : { kind: "exhausted" };
}
