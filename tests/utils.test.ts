import { describe, expect, it } from "vitest";
import { cn } from "../lib/utils";

describe("cn", () => {
  it("joins classes and skips falsy values", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });

  it("the later class wins within a property group", () => {
    expect(cn("h-12 px-[18px]", "h-[58px] px-0")).toBe("h-[58px] px-0");
    expect(cn("rounded-btn-sm", "rounded-btn")).toBe("rounded-btn");
    expect(cn("w-full", "lg:w-fit", "w-auto")).toBe("lg:w-fit w-auto");
  });

  it("keeps different variants apart", () => {
    expect(cn("h-[58px] lg:h-[60px]", "h-12")).toBe("lg:h-[60px] h-12");
    expect(cn("min-[600px]:max-w-[600px]", "lg:max-w-[1184px]")).toBe("min-[600px]:max-w-[600px] lg:max-w-[1184px]");
  });

  it("tells text sizes (custom tokens, arbitrary lengths) from text colours", () => {
    expect(cn("text-body text-ube")).toBe("text-body text-ube");
    expect(cn("text-small font-bold text-ube", "text-body")).toBe("font-bold text-ube text-body");
    expect(cn("text-[#CDB8EC]", "text-[19px]")).toBe("text-[#CDB8EC] text-[19px]");
    expect(cn("text-ube", "text-gabi-text")).toBe("text-gabi-text");
  });

  it("tells font families from weights", () => {
    expect(cn("font-sans font-bold", "font-head font-normal")).toBe("font-head font-normal");
    expect(cn("font-head", "font-bold")).toBe("font-head font-bold");
  });

  it("splits border width, style, colour and sides", () => {
    expect(cn("border-[1.5px] border-ube border-dashed", "border-transparent")).toBe("border-[1.5px] border-dashed border-transparent");
    expect(cn("border-[1.5px]", "border-b-0")).toBe("border-[1.5px] border-b-0");
    expect(cn("border-[1.5px]", "border-[2.5px]")).toBe("border-[2.5px]");
  });

  it("splits display, flex direction and flex sizing", () => {
    expect(cn("flex flex-col flex-1", "hidden")).toBe("flex-col flex-1 hidden");
    expect(cn("contents lg:flex")).toBe("contents lg:flex");
  });

  it("handles negatives, arbitrary values with colons, and arbitrary properties", () => {
    expect(cn("-ml-1.5", "ml-0")).toBe("ml-0");
    expect(cn("lg:[@media(min-height:640px)]:sticky", "lg:[@media(min-height:640px)]:top-6")).toBe(
      "lg:[@media(min-height:640px)]:sticky lg:[@media(min-height:640px)]:top-6",
    );
    expect(cn("[--rx:76%] [--ry:22%]")).toBe("[--rx:76%] [--ry:22%]");
    expect(cn("bg-[length:8px_5px] bg-[right_14px_center] bg-no-repeat bg-papel")).toBe(
      "bg-[length:8px_5px] bg-[right_14px_center] bg-no-repeat bg-papel",
    );
  });

  it("keeps the app's own utilities and overflow axes apart", () => {
    expect(cn("lst-row", "lst-row2")).toBe("lst-row lst-row2");
    expect(cn("overflow-hidden", "overflow-x-auto")).toBe("overflow-hidden overflow-x-auto");
    expect(cn("outline-3 outline-offset-2 outline-ilaw", "-outline-offset-3")).toBe("outline-3 outline-ilaw -outline-offset-3");
  });
});
