import { describe, expect, it } from "vitest";
import { checkDrawFeasibility, describeDrawFailure, listNames, TOO_FEW_MESSAGE } from "@/server/draw-check";
import type { Exclusion } from "@/server/draw";

const people = (...names: string[]) => names.map((displayName, i) => ({ id: `id-${i}`, displayName }));
const idOf = (list: { id: string; displayName: string }[], name: string) => list.find((m) => m.displayName === name)!.id;

describe("listNames", () => {
  it("joins names the Tagalog way", () => {
    expect(listNames(["Joy"])).toBe("Joy");
    expect(listNames(["Joy", "Ben"])).toBe("Joy at Ben");
    expect(listNames(["Joy", "Ben", "Marco"])).toBe("Joy, Ben at Marco");
  });
});

describe("checkDrawFeasibility", () => {
  it("needs at least 3 members", () => {
    expect(checkDrawFeasibility(people("Joy", "Ben"), [])).toEqual({ status: "too_few", message: TOO_FEW_MESSAGE });
    expect(checkDrawFeasibility(people("Joy", "Ben", "Marco"), []).status).toBe("ok");
  });

  it("is fine with a reasonable exclusion", () => {
    const m = people("Joy", "Joy M", "Tita Org", "Ben");
    expect(checkDrawFeasibility(m, [[idOf(m, "Joy"), idOf(m, "Joy M")]]).status).toBe("ok");
  });

  it("names the person with too many exclusions", () => {
    const m = people("Joy", "Joy M", "Tita Org", "Ben");
    const exclusions: Exclusion[] = [
      [idOf(m, "Joy"), idOf(m, "Joy M")],
      [idOf(m, "Joy"), idOf(m, "Tita Org")],
    ];
    const result = checkDrawFeasibility(m, exclusions);
    expect(result).toMatchObject({ status: "impossible", stuckMemberIds: [idOf(m, "Joy")] });
    if (result.status === "impossible") {
      expect(result.message).toBe("Masyadong maraming bawal kay Joy. Tanggalin ang isa sa mga pair niya.");
    }
  });

  it("names several stuck people", () => {
    const m = people("A", "B", "C");
    const result = checkDrawFeasibility(m, [[idOf(m, "A"), idOf(m, "B")]]);
    expect(result.status).toBe("impossible");
    if (result.status === "impossible") expect(result.message).toMatch(/^Masyadong maraming bawal kina (A at B|B at A)\./);
  });

  it("explains a group split in two", () => {
    const m = people("A", "B", "C", "X", "Y", "Z");
    const cross: Exclusion[] = ["A", "B", "C"].flatMap((l) => ["X", "Y", "Z"].map((r) => [idOf(m, l), idOf(m, r)] as const));
    const result = checkDrawFeasibility(m, cross);
    expect(result.status).toBe("impossible");
    if (result.status === "impossible") expect(result.message).toMatch(/^Nahahati ang group/);
  });
});

describe("describeDrawFailure", () => {
  const base = { ok: false as const, stuckMembers: [], blockingExclusions: [] };
  it("covers every failure reason with plain words", () => {
    const nameOf = () => "Joy";
    expect(describeDrawFailure({ ...base, reason: "TOO_FEW_MEMBERS", message: "" }, nameOf)).toBe(TOO_FEW_MESSAGE);
    expect(describeDrawFailure({ ...base, reason: "INVALID_INPUT", message: "" }, nameOf)).toMatch(/I-refresh/);
    expect(describeDrawFailure({ ...base, reason: "IMPOSSIBLE", message: "" }, nameOf)).toMatch(/Masyadong maraming bawal/);
    expect(describeDrawFailure({ ...base, reason: "SEARCH_LIMIT", message: "" }, nameOf)).toMatch(/Masyadong maraming bawal/);
  });
});
