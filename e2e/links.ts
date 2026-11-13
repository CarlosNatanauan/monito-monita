import { expect, type Page } from "@playwright/test";

/**
 * The personal link on /me. It's shown masked ("…/me?t=••••••"), so the
 * test gets the real link the way a person does: "Copy my link". The copy
 * is caught in the page (no OS clipboard), and the token must not appear
 * anywhere in the visible text.
 */
export async function readMyLink(page: Page): Promise<string> {
  const box = page.locator("[data-masked-link]");
  await expect(box).toHaveText(/^https?:\/\/[^/]+\/…\/me\?t=•{6}/);

  await page.evaluate(() => {
    const w = window as unknown as { __copied?: string };
    w.__copied = undefined;
    Object.defineProperty(navigator.clipboard, "writeText", {
      configurable: true,
      value: async (text: string) => {
        w.__copied = text;
      },
    });
  });
  const copy = page.getByRole("button", { name: "Copy my link" });
  await copy.click();
  await expect(page.getByRole("button", { name: "Copied!" })).toBeVisible();
  const link = await page.evaluate(() => (window as unknown as { __copied?: string }).__copied ?? "");
  expect(link).toMatch(/^https?:\/\/[^/]+\/g\/[a-z0-9]+\/me\?t=[\w-]+/);

  const token = new URL(link).searchParams.get("t")!;
  expect(await page.locator("body").innerText(), "the token is visible on /me").not.toContain(token);
  return link;
}
