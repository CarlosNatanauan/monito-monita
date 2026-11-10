import { describe, expect, it } from "vitest";
import { displayDomain, normalizeWishUrl } from "@/lib/wish";
import { wishSchema } from "@/server/wishlists";

describe("normalizeWishUrl", () => {
  it("accepts http and https links", () => {
    expect(normalizeWishUrl("https://shopee.ph/product/123")).toBe("https://shopee.ph/product/123");
    expect(normalizeWishUrl("http://example.com")).toBe("http://example.com/");
  });

  it("adds https:// when there's no scheme", () => {
    expect(normalizeWishUrl("shopee.ph/abc")).toBe("https://shopee.ph/abc");
    expect(normalizeWishUrl("  www.lazada.com.ph/x  ")).toBe("https://www.lazada.com.ph/x");
  });

  it("rejects anything that isn't a plain http(s) link", () => {
    for (const bad of [
      "javascript:alert(1)",
      "data:text/html,hi",
      "ftp://example.com/file",
      "mailto:joy@example.com",
      "file:///etc/passwd",
      "localhost",
      "https://user:pass@example.com",
      "not a url at all",
    ]) {
      expect(normalizeWishUrl(bad), bad).toBeNull();
    }
    expect(normalizeWishUrl("   ")).toBeNull();
  });
});

describe("displayDomain", () => {
  it("shows just the domain", () => {
    expect(displayDomain("https://www.shopee.ph/product/123?x=1")).toBe("shopee.ph");
    expect(displayDomain("https://lazada.com.ph/a")).toBe("lazada.com.ph");
    expect(displayDomain("nope")).toBe("");
  });
});

describe("wishSchema", () => {
  it("accepts a title only", () => {
    expect(wishSchema.parse({ title: "  Mug na cute  " })).toEqual({ title: "Mug na cute", url: null, note: null });
  });

  it("normalizes link and note", () => {
    expect(wishSchema.parse({ title: "Plant", url: "shopee.ph/plant", note: "  small lang " })).toEqual({
      title: "Plant",
      url: "https://shopee.ph/plant",
      note: "small lang",
    });
  });

  it("enforces limits and valid links", () => {
    expect(wishSchema.safeParse({ title: "" }).success).toBe(false);
    expect(wishSchema.safeParse({ title: "x".repeat(81) }).success).toBe(false);
    expect(wishSchema.safeParse({ title: "x".repeat(80) }).success).toBe(true);
    expect(wishSchema.safeParse({ title: "Mug", note: "x".repeat(201) }).success).toBe(false);
    expect(wishSchema.safeParse({ title: "Mug", url: "javascript:alert(1)" }).success).toBe(false);
    expect(wishSchema.safeParse({ title: "Mug", url: `https://a.com/${"x".repeat(500)}` }).success).toBe(false);
  });
});
