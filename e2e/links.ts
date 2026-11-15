import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Reads a masked link the way a person gets it: the box shows the real
 * link with the token as dots ("host/g/{slug}/{page}?t=••••••••••"), and `copy` puts the real link on the
 * clipboard. The copy is caught in the page (no OS clipboard), and the
 * token must not appear anywhere in the visible text.
 */
export async function readMaskedLink(
  page: Page,
  { scope, copyLabel, pageName }: { scope?: Locator; copyLabel: string; pageName: "me" | "admin" },
): Promise<string> {
  const within = scope ?? page.locator("body");
  // Only the visible box (/me draws the card in one of two places per screen size).
  const box = within.locator("[data-masked-link]").filter({ visible: true });
  // Host, the real path, then dots, once the origin is known ("localhost:3000/g/abc/me?t=••••••••••").
  await expect(box).toHaveText(new RegExp(`^[a-z0-9.-]+(:\\d+)?/g/[a-z0-9]+/${pageName}\\?t=•{10}`));

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
  await within.getByRole("button", { name: copyLabel, exact: true }).click();
  await expect(within.getByRole("button", { name: "Copied!" })).toBeVisible();
  const link = await page.evaluate(() => (window as unknown as { __copied?: string }).__copied ?? "");
  expect(link).toMatch(new RegExp(`^https?://[^/]+/g/[a-z0-9]+/${pageName}\\?t=[\\w-]+`));
  // The copied link uses the page's own origin (no NEXT_PUBLIC_SITE_URL in dev), never a hardcoded domain.
  expect(new URL(link).origin).toBe(new URL(page.url()).origin);

  const token = new URL(link).searchParams.get("t")!;
  expect(await page.locator("body").innerText(), `the token is visible on ${page.url()}`).not.toContain(token);
  return link;
}

/** The personal link on /me, via "Copy my link". */
export async function readMyLink(page: Page): Promise<string> {
  return readMaskedLink(page, { copyLabel: "Copy my link", pageName: "me" });
}
