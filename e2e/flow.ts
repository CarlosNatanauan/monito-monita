/**
 * Shared helpers for the main-flow specs (flow-1 … flow-4). Each person
 * gets their own browser context (own cookies), like separate phones.
 */
import { mkdirSync, rmSync } from "node:fs";
import { expect, type Browser, type BrowserContext, type Page, type TestInfo } from "@playwright/test";

export interface Person {
  label: string;
  context: BrowserContext;
  page: Page;
}

/**
 * People for one spec, plus every console error and uncaught exception on
 * their pages (the spec ends by expecting none).
 */
export function people(browser: Browser, testInfo: TestInfo) {
  const problems: string[] = [];

  function watch(page: Page, label: string) {
    page.on("console", (msg) => {
      if (msg.type() === "error") problems.push(`[${label}] console.error on ${page.url()}: ${msg.text()}`);
    });
    page.on("pageerror", (error) => {
      // WebKit reports a refresh fetch cancelled by leaving the page (the
      // reveal screen's auto-refresh, mid-flight during a navigation) as an
      // "access control" error. Harmless: the page is already unloading.
      if (/\?_rsc=\S+ due to access control checks/.test(error.message)) return;
      // The same race, as newer WebKit reports it: the aborted refresh is a
      // bare "Load failed", and the dev overlay's stack lookup is blocked
      // while the page unloads. Only on the reveal screen (seen during
      // page.goto away from it), only in WebKit.
      if (
        browser.browserType().name() === "webkit" &&
        /\/reveal$/.test(new URL(page.url()).pathname) &&
        (error.message === "Load failed" || /__nextjs_original-stack-frames due to access control checks/.test(error.message))
      ) {
        return;
      }
      problems.push(`[${label}] uncaught error on ${page.url()}: ${error.message}`);
    });
  }

  /** A new "phone": fresh context with the project's device settings. */
  async function newPerson(label: string): Promise<Person> {
    const use = testInfo.project.use;
    const context = await browser.newContext({
      baseURL: use.baseURL,
      viewport: use.viewport,
      userAgent: use.userAgent,
      deviceScaleFactor: use.deviceScaleFactor,
      isMobile: use.isMobile,
      hasTouch: use.hasTouch,
      locale: "en-PH",
      timezoneId: "Asia/Manila",
    });
    // Chromium needs permission to read the clipboard back in tests.
    if (browser.browserType().name() === "chromium") {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    }
    const page = await context.newPage();
    watch(page, label);
    return { label, context, page };
  }

  /** A person already logged in by opening their seeded personal link(s). */
  async function loggedIn(label: string, ...links: string[]): Promise<Person> {
    const person = await newPerson(label);
    for (const link of links) {
      await person.page.goto(link);
      await expect(person.page).not.toHaveURL(/[?&]t=/);
    }
    return person;
  }

  return { problems, newPerson, loggedIn };
}

/** Full-page screenshots in e2e/screenshots/{project}/{spec}/, numbered in order. */
export function screenshotter(testInfo: TestInfo, spec: string) {
  const dir = `e2e/screenshots/${testInfo.project.name}/${spec}`;
  // Start fresh so old runs with different step numbers do not linger.
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  let n = 0;
  return async (page: Page, name: string) => {
    n += 1;
    // caret: "initial" so a screenshot taken before hydration never edits the DOM
    // (the default hides the caret with an inline style React then flags).
    await page.screenshot({ path: `${dir}/${String(n).padStart(2, "0")}-${name}.png`, fullPage: true, caret: "initial" });
  };
}

/**
 * Navigates (or reloads, with no url), retrying once when WebKit reports the
 * load as interrupted: the reveal screen's 2-second router.refresh() can
 * start a navigation at the same moment as the test's own. Harmless for
 * people; only the test sees the race.
 */
export async function navigate(page: Page, url?: string) {
  const go = () => (url ? page.goto(url) : page.reload());
  try {
    await go();
  } catch (error) {
    if (!/interrupted/i.test(String(error))) throw error;
    await go();
  }
}

/**
 * The selectable link text in a LinkBox, once it shows the host (the box
 * shows links without the scheme, like the reference: "host/g/abc"). Returns
 * the absolute URL.
 */
export async function readLink(page: Page, pattern: RegExp): Promise<string> {
  const box = page.locator("p.select-all").filter({ hasText: pattern });
  await expect(box).toHaveText(/^[a-z0-9.-]+(:\d+)?\//);
  return `${new URL(page.url()).protocol}//${(await box.textContent())!.trim()}`;
}

export async function join(page: Page, shareUrl: string, name: string, pin = "1234") {
  await page.goto(shareUrl);
  await page.getByLabel("Pangalan mo").fill(name);
  await page.getByLabel("4-digit PIN").fill(pin);
  await page.getByRole("button", { name: "Join the group" }).click();
}

// --- The slip (signature moment #3) ----------------------------------------

export const tapToOpen = (page: Page) => page.getByRole("button", { name: "Tap to open your bunutan" });

/** The name written on the open slip ("~ Ate Joy ~" → "Ate Joy"). */
export async function readSlipName(page: Page): Promise<string> {
  const text = await page.locator('section[aria-label="Your monito"] [data-part="name-inner"]').textContent();
  return text!.replace(/ /g, " ").replace(/~/g, "").trim();
}

/** Taps the folded slip, waits for the unfold and the save, returns the name. */
export async function openSlip(page: Page): Promise<string> {
  await expect(tapToOpen(page)).toBeVisible();
  const saved = page.waitForResponse(
    (r) => r.request().method() === "POST" && Boolean(r.request().headers()["next-action"]),
    { timeout: 30_000 },
  );
  await tapToOpen(page).click();
  // The button goes away when the animation finishes (~2s).
  await expect(tapToOpen(page)).toHaveCount(0, { timeout: 15_000 });
  await saved;
  return readSlipName(page);
}

/** Records whether the page downloads GSAP (the lazy unfold chunk). */
export function watchForGsap(page: Page) {
  const seen = { gsap: false };
  page.on("response", async (r) => {
    if (!/\.js(\?|$)/.test(r.url())) return;
    const body = await r.text().catch(() => "");
    if (body.includes("GreenSock")) seen.gsap = true;
  });
  return seen;
}

/** The organizer page's cards appear in exactly this order (by card title). */
export async function expectCardOrder(page: Page, titles: (string | RegExp)[]) {
  const all = await page.locator('[data-slot="card-title"]').allTextContents();
  // A title matches exactly, as "Title (n)", or by RegExp.
  const matches = (text: string, t: string | RegExp) =>
    typeof t === "string" ? text === t || text.startsWith(`${t} (`) : t.test(text);
  const positions = titles.map((t) => all.findIndex((text) => matches(text.trim(), t)));
  for (const [i, t] of titles.entries()) expect(positions[i], `card "${t}" is on the page`).toBeGreaterThanOrEqual(0);
  expect(positions, `cards in order: ${titles.join(" → ")}`).toEqual([...positions].sort((a, b) => a - b));
}

/** Checks the GC reminder preview and that Copy copies exactly that text. */
export async function checkReminder(
  browser: Browser,
  page: Page,
  expected: (string | RegExp)[],
  absent: string[] = [],
) {
  const preview = page.getByLabel("Reminder preview");
  // Copy is enabled once the browser has filled in the full share link.
  await expect(page.getByRole("button", { name: /^Copy (reminder|announcement)$/ })).toBeEnabled();
  for (const text of expected) await expect(preview).toContainText(text);
  for (const text of absent) await expect(preview).not.toContainText(text);
  await page.getByRole("button", { name: /^Copy (reminder|announcement)$/ }).click();
  await expect(page.getByRole("button", { name: "Copied!" })).toBeVisible();
  if (browser.browserType().name() === "chromium") {
    // The Windows clipboard turns \n into \r\n; compare the text itself.
    const copied = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n");
    expect(copied).toBe(await preview.textContent());
  }
}

/** Wishlist titles per person used by the specs. Unique, and never a member's name (leak checks). */
export const WISHES: Record<string, string[]> = {
  Joy: ["Mug na cute (blue)", "Plant (small lang)"],
  "Joy M": ["Notebook"],
  Ben: ["Socks"],
  "Tita Org": [],
};
