import { describe, expect, it } from "vitest";
import { findByDisplayName, withoutHonorific } from "@/server/names";

const people = (...names: string[]) => names.map((displayName, i) => ({ id: String(i), displayName }));

describe("withoutHonorific (persona test C3)", () => {
  it("drops one leading Kuya, Ate, Tita, Tito, Sir or Ma'am", () => {
    expect(withoutHonorific("Kuya Ben")).toBe("Ben");
    expect(withoutHonorific("  tita   Nena ")).toBe("Nena");
    expect(withoutHonorific("ATE Carla")).toBe("Carla");
    expect(withoutHonorific("Tito Boy")).toBe("Boy");
    expect(withoutHonorific("Sir Rommel")).toBe("Rommel");
    expect(withoutHonorific("Ma'am Grace")).toBe("Grace");
    expect(withoutHonorific("Ma’am Grace")).toBe("Grace");
    expect(withoutHonorific("Maam Grace")).toBe("Grace");
  });

  it("leaves other names alone", () => {
    expect(withoutHonorific("Kuya")).toBe("Kuya");
    expect(withoutHonorific("Atena")).toBe("Atena");
    expect(withoutHonorific("Ben Kuya")).toBe("Ben Kuya");
    expect(withoutHonorific("Sirius Black")).toBe("Sirius Black");
  });
});

describe("findByDisplayName (persona test C3)", () => {
  it("prefers the exact name, ignoring case and spaces", () => {
    expect(findByDisplayName(people("Ben", "Kuya Ben"), " ben ")?.displayName).toBe("Ben");
    expect(findByDisplayName(people("Ben", "Kuya Ben"), "kuya ben")?.displayName).toBe("Kuya Ben");
  });

  it("finds the one member a name fits without the honorific, on either side", () => {
    expect(findByDisplayName(people("Kuya Ben", "Nena"), "Ben")?.displayName).toBe("Kuya Ben");
    expect(findByDisplayName(people("Tita Nena", "Ben"), "nena")?.displayName).toBe("Tita Nena");
    expect(findByDisplayName(people("Nena"), "Tita Nena")?.displayName).toBe("Nena");
    expect(findByDisplayName(people("Tita Nena"), "Ate Nena")?.displayName).toBe("Tita Nena");
  });

  it("finds nobody when two or more members fit, or none does", () => {
    expect(findByDisplayName(people("Kuya Ben", "Tito Ben"), "Ben")).toBeNull();
    expect(findByDisplayName(people("Kuya Ben"), "Benny")).toBeNull();
    expect(findByDisplayName(people("Kuya Ben"), "Kuya")).toBeNull();
    expect(findByDisplayName(people("Kuya Ben"), "  ")).toBeNull();
  });
});
