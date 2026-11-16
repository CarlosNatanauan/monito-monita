/**
 * Name + PIN, end to end on a phone: join with a PIN, come back in a fresh
 * browser, a taken name in the join form, wrong PIN, lockout, organizer
 * unlock, "Bago ka?", reset PIN, coming back after the draw, the share
 * button, and leak checks (no names on the join page; come-back errors are
 * identical whether or not the name exists).
 *
 * Each person has their own browser context (own cookies), like separate
 * phones. Runs against `next dev` and the DEV database (without Upstash,
 * so no IP limit); the test group is deleted afterwards.
 */
import { eq } from "drizzle-orm";
import type { Browser, BrowserContext, Page, TestInfo } from "@playwright/test";
import { expect, test } from "./test";
import { addDays, todayIn } from "../lib/theme-weeks";
import { closeDb, db } from "../server/db";
import { members } from "../server/db/schema";
import { deleteGroups, E2E_PREFIX } from "./db-cleanup";
import { readLink } from "./flow";
import { readMaskedLink, readMyLink } from "./links";
import { capturePage, expectJoinPageClean, getTruth } from "./leak";

const createdSlugs: string[] = [];

test.afterAll(async () => {
  await deleteGroups(createdSlugs);
  await closeDb();
});

const WRONG = "Mali ang pangalan o PIN";
const ASK_ORGANIZER = "Nakalimutan ang PIN? I-message ang organizer, bibigyan ka niya ng bagong link.";
const MINE = "Ako 'yan, ilalagay ko ang PIN";
const NOT_MINE = "Hindi ako 'yan, gagamit ako ng ibang pangalan";

const problems: string[] = [];

interface Person {
  context: BrowserContext;
  page: Page;
}

async function newPerson(
  browser: Browser,
  testInfo: TestInfo,
  label: string,
  init?: () => void,
): Promise<Person> {
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
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") problems.push(`[${label}] console.error on ${page.url()}: ${msg.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`[${label}] uncaught error on ${page.url()}: ${error.message}`));
  return { context, page };
}

const isAction = (r: { request(): { method(): string; headers(): Record<string, string> } }) =>
  r.request().method() === "POST" && Boolean(r.request().headers()["next-action"]);

async function joinWith(page: Page, shareUrl: string, name: string, pin: string) {
  await page.goto(shareUrl);
  await page.getByLabel("Pangalan mo").fill(name);
  await page.getByLabel("4-digit PIN").fill(pin);
  await page.getByRole("button", { name: "Join the group" }).click();
}

/** Opens the come-back form from the join page. */
async function openComeBack(page: Page, shareUrl: string) {
  await page.goto(shareUrl);
  await page.getByRole("link", { name: "Kasali ka na? Bumalik dito" }).click();
  await expect(page.getByRole("form", { name: "Bumalik" })).toBeVisible();
}

/**
 * Submits the come-back form (name field optional: it's hidden after a
 * taken name) and returns the action's raw response body.
 */
async function submitComeBack(page: Page, pin: string, name?: string): Promise<string> {
  const form = page.getByRole("form", { name: "Bumalik" });
  if (name !== undefined) await form.getByLabel("Pangalan mo").fill(name);
  await form.getByLabel("4-digit PIN").fill(pin);
  const response = page.waitForResponse(isAction);
  await form.getByRole("button", { name: "Buksan ang slip ko" }).click();
  return (await response).text();
}

async function expectWrong(page: Page) {
  await expect(page.getByRole("form", { name: "Bumalik" }).getByRole("alert")).toHaveText(WRONG);
}

/** After a taken name: the two equal choices, both on screen without scrolling (persona test C2). */
async function expectTakenChoice(page: Page, typed: string) {
  await expect(page.getByRole("heading", { name: `May ${typed} na sa group` })).toBeVisible();
  for (const name of [MINE, NOT_MINE]) {
    const button = page.getByRole("button", { name });
    await expect(button).toBeInViewport({ ratio: 1 });
    await expect(button).toHaveAttribute("data-variant", "secondary");
  }
}

test("name + PIN: join, come back, taken name, lockout, unlock, reset, after the draw, leaks", async ({
  browser,
}, testInfo) => {
  const groupName = `${E2E_PREFIX}PIN (${testInfo.project.name})`;
  let shareUrl = "";
  let slug = "";

  const organizer = await newPerson(browser, testInfo, "organizer");
  await test.step("organizer creates a group", async () => {
    const { page } = organizer;
    await page.goto("/new");
    // Fill after hydration: WebKit otherwise loses the first field.
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Pangalan ng group").fill(groupName);
    await expect(page.getByLabel("Pangalan ng group")).toHaveValue(groupName);
    await page.getByLabel("Budget", { exact: true }).fill("300");
    await page.getByLabel("Petsa ng party").fill(addDays(todayIn("Asia/Manila"), 30));
    await page.getByRole("button", { name: "Create group" }).click();
    await expect(page.getByRole("heading", { name: "Ready na ang group mo!" })).toBeVisible();
    shareUrl = await readLink(page, /\/g\/[a-z0-9]+$/);
    slug = new URL(shareUrl).pathname.split("/")[2];
    createdSlugs.push(slug);
  });

  // Phone A has the Web Share API (stubbed to record what it was given).
  const anaA = await newPerson(browser, testInfo, "Ana (phone A)", () => {
    const w = window as unknown as { __shared: unknown[] };
    w.__shared = [];
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: unknown) => {
        w.__shared.push(data);
      },
    });
  });
  let anaLink = "";
  await test.step("Ana joins with name + PIN; 'Send to yourself' leads /me", async () => {
    const { page } = anaA;
    await page.goto(shareUrl);
    const pin = page.getByLabel("4-digit PIN");
    await expect(pin).toHaveAttribute("inputmode", "numeric");
    await expect(pin).toHaveAttribute("type", "password");
    await expect(page.getByText("Gamit mo pagbalik", { exact: false })).toBeVisible();
    await joinWith(page, shareUrl, "Ana", "1234");
    await expect(page.getByRole("heading", { name: "Hi, Ana!" })).toBeVisible();

    // Right after joining: the link card comes first, Share is the main button.
    const titles = await page.locator('[data-slot="card-title"]').allTextContents();
    expect(titles[0]).toBe("I-save ang link mo!");
    const share = page.getByRole("button", { name: "I-send sa sarili mo" });
    await expect(share).toHaveAttribute("data-variant", "default");
    await expect(page.getByRole("button", { name: "Copy my link" })).toHaveAttribute("data-variant", "secondary");
    anaLink = await readMyLink(page);
    await share.click();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __shared: { url: string }[] }).__shared))
      .toEqual([expect.objectContaining({ url: anaLink })]);
    // No PIN card: she set one when joining.
    await expect(page.getByText("Mag-set ng PIN")).toHaveCount(0);

    // Later visits: the link card sits at the bottom, not highlighted.
    await page.reload();
    const later = await page.locator('[data-slot="card-title"]').allTextContents();
    expect(later.at(-1)).toBe("Personal link mo");
  });

  await test.step("without the Web Share API, Copy is the main button", async () => {
    const noShare = await newPerson(browser, testInfo, "no share", () => {
      Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    });
    await joinWith(noShare.page, shareUrl, "Ben", "2222");
    await expect(noShare.page.getByRole("heading", { name: "Hi, Ben!" })).toBeVisible();
    await expect(noShare.page.getByRole("button", { name: "I-send sa sarili mo" })).toHaveCount(0);
    await expect(noShare.page.getByRole("button", { name: "Copy my link" })).toHaveAttribute("data-variant", "default");
    await noShare.context.close();
  });

  await test.step("join page lists no names, before and in the come-back form", async () => {
    const truth = await getTruth(slug);
    const stranger = await newPerson(browser, testInfo, "stranger");
    expectJoinPageClean(await capturePage(stranger.page, shareUrl), truth);
    expectJoinPageClean(await capturePage(stranger.page, `${shareUrl}?bumalik=1`), truth);
    await stranger.context.close();
  });

  await test.step("Ana comes back in a fresh browser; phone A stays logged in", async () => {
    const anaB = await newPerson(browser, testInfo, "Ana (phone B)");
    await openComeBack(anaB.page, shareUrl);
    // Open group: "Bago ka?" goes to the join form.
    await expect(anaB.page.getByRole("link", { name: "Bago ka? Sumali dito" })).toHaveAttribute("href", `/g/${slug}`);
    await submitComeBack(anaB.page, "1234", "  ana ");
    await expect(anaB.page).toHaveURL(new RegExp(`/g/${slug}/me$`));
    await expect(anaB.page.getByRole("heading", { name: "Hi, Ana!" })).toBeVisible();
    await anaB.context.close();

    await anaA.page.goto(`/g/${slug}/me`);
    await expect(anaA.page.getByRole("heading", { name: "Hi, Ana!" })).toBeVisible();
  });

  await test.step("a taken name: 'Ako 'yan' or 'Hindi ako 'yan'; wrong PIN; 'Bago ka?'; right PIN", async () => {
    const anaC = await newPerson(browser, testInfo, "Ana (phone C)");
    const { page } = anaC;
    const responses: string[] = [];
    page.on("response", async (r) => {
      if (isAction(r)) responses.push(await r.text().catch(() => ""));
    });
    await joinWith(page, shareUrl, "ANA", "9999");
    // Only the name she typed is said back, never anyone else's.
    await expectTakenChoice(page, "ANA");
    await expect(page.getByLabel("4-digit PIN")).toHaveCount(0);

    // "Hindi ako 'yan": the join form again, her name kept, a hint to add an initial.
    await page.getByRole("button", { name: NOT_MINE }).click();
    await expect(page.getByRole("form", { name: "Sumali" })).toBeVisible();
    await expect(page.getByLabel("Pangalan mo")).toHaveValue("ANA");
    await expect(page.getByLabel("Pangalan mo")).toBeFocused();
    await expect(page.getByText("May ANA na. Lagyan ng initial, hal. “ANA R.”")).toBeVisible();

    // Same name again → the choice again; this time "Ako 'yan" (the PIN form).
    await page.getByLabel("4-digit PIN").fill("9999");
    await page.getByRole("button", { name: "Join the group" }).click();
    await expectTakenChoice(page, "ANA");
    await page.getByRole("button", { name: MINE }).click();
    // The PIN isn't carried over: she types it on purpose.
    await expect(page.getByRole("form", { name: "Bumalik" }).getByLabel("4-digit PIN")).toHaveValue("");
    await expect(page.getByText(ASK_ORGANIZER)).toBeVisible();

    await submitComeBack(page, "9999");
    await expectWrong(page);
    // The organizer hint stays under the error (persona test C1).
    await expect(page.getByText(ASK_ORGANIZER)).toBeVisible();

    await page.getByRole("button", { name: "Bago ka? Sumali dito" }).click();
    await expect(page.getByRole("form", { name: "Sumali" })).toBeVisible();
    await expect(page.getByLabel("Pangalan mo")).toHaveValue("ANA");

    // Back to the come-back form via the same name, then the right PIN.
    await page.getByLabel("4-digit PIN").fill("1234");
    await page.getByRole("button", { name: "Join the group" }).click();
    await expectTakenChoice(page, "ANA");
    await page.getByRole("button", { name: MINE }).click();
    await submitComeBack(page, "1234");
    await expect(page.getByRole("heading", { name: "Hi, Ana!" })).toBeVisible();

    // Nothing created by the taken-name tries, and no response named anyone
    // else (the last one is the redirect to Ana's own page).
    expect((await getTruth(slug)).members.filter((m) => /ana/i.test(m.name))).toHaveLength(1);
    expect(responses.length).toBeGreaterThanOrEqual(4);
    for (const body of responses) expect(body).not.toContain("Ben");
    await anaC.context.close();
  });

  const anaD = await newPerson(browser, testInfo, "Ana (phone D)");
  await test.step("leak: come-back errors are identical whether or not the name exists", async () => {
    const { page } = anaD;
    await openComeBack(page, shareUrl);
    const existing = await submitComeBack(page, "0000", "Ana");
    await expectWrong(page);
    const missing = await submitComeBack(page, "0000", "Walang Ganito");
    await expectWrong(page);
    expect(missing).toBe(existing);
    expect(existing).not.toContain("Ana");
    expectJoinPageClean(await page.content(), await getTruth(slug));
  });

  await test.step("5 wrong → locked for 15 min (right PIN fails, the organizer sees it); 10 → locked until unlocked", async () => {
    const { page } = anaD;
    // 2 failures in this browser so far (1 of them Ana's): the quiet hint, under the error.
    await expect(page.getByText(ASK_ORGANIZER)).toBeVisible();
    await expect(page.getByText("Huminto muna.")).toHaveCount(0);
    // 4 more for Ana → 5: locked. From the 3rd failure in this browser, the hint grows.
    for (let i = 0; i < 4; i++) {
      await submitComeBack(page, "0000", "Ana");
      await expectWrong(page);
    }
    await expect(page.getByRole("status").filter({ hasText: "Huminto muna." })).toBeVisible();
    await expect(page.getByText("bibigyan ka niya ng bagong link", { exact: false })).toBeVisible();
    await submitComeBack(page, "1234", "Ana");
    await expectWrong(page);

    // The organizer sees the 15-minute lock, with "Get new link" right there (persona test C1).
    await organizer.page.goto(`/g/${slug}/admin`);
    const tempLock = organizer.page.getByRole("group", { name: "Maling PIN ni Ana" });
    await expect(tempLock.getByText("Maraming maling PIN kanina")).toBeVisible();
    await expect(organizer.page.getByText("Maraming maling PIN kanina")).toHaveCount(1);
    await tempLock.getByRole("button", { name: "Get new link for Ana (locked)" }).click();
    await expect(organizer.page.getByRole("checkbox", { name: /Reset PIN/ })).toBeChecked();
    await organizer.page.getByRole("button", { name: "Huwag" }).click();

    // Pretend 15 minutes passed.
    const anaId = (await getTruth(slug)).members.find((m) => m.name === "Ana")!.id;
    await db().update(members).set({ pinLockedUntil: new Date(Date.now() - 1000) }).where(eq(members.id, anaId));
    for (let i = 0; i < 5; i++) {
      await submitComeBack(page, "0000", "Ana");
      await expectWrong(page);
    }
    await submitComeBack(page, "1234", "Ana");
    await expectWrong(page);
  });

  await test.step("organizer sees the lock and unlocks; Ana gets in", async () => {
    const { page } = organizer;
    await page.goto(`/g/${slug}/admin`);
    const lock = page.getByRole("group", { name: "PIN lock for Ana" });
    await expect(lock.getByText("Na-lock ang PIN ni Ana")).toBeVisible();
    await expect(page.getByText(/^Na-lock ang PIN ni /)).toHaveCount(1);
    // Fully locked: no 15-minute notice on top of it.
    await expect(page.getByText("Maraming maling PIN kanina")).toHaveCount(0);
    await lock.getByRole("button", { name: "Unlock" }).click();
    await expect(page.getByText("Na-lock ang PIN ni Ana")).toHaveCount(0);

    await submitComeBack(anaD.page, "1234", "Ana");
    await expect(anaD.page.getByRole("heading", { name: "Hi, Ana!" })).toBeVisible();
    await anaD.context.close();
  });

  await test.step("Get new link + Reset PIN: Ana sets a new PIN on /me; old devices are out", async () => {
    const { page } = organizer;
    await page.goto(`/g/${slug}/admin`);
    await page.getByRole("button", { name: "Manage Ana", exact: true }).click();
    await page.getByRole("button", { name: "Get new link for Ana" }).click();
    await page.getByRole("checkbox", { name: /Reset PIN/ }).check();
    await page.getByRole("button", { name: "Oo, gumawa ng bago" }).click();
    const group = page.getByRole("group", { name: "New link for Ana" });
    await expect(group.getByText("Na-reset ang PIN niya", { exact: false })).toBeVisible();
    const newLink = await readMaskedLink(page, { scope: group, copyLabel: "Copy link", pageName: "me" });

    const anaE = await newPerson(browser, testInfo, "Ana (phone E)");
    await anaE.page.goto(newLink);
    await expect(anaE.page.getByRole("heading", { name: "Hi, Ana!" })).toBeVisible();
    const card = anaE.page.getByRole("region", { name: "Mag-set ng PIN" });
    await expect(card.getByText("Mag-set ng PIN", { exact: true })).toBeVisible();
    await card.getByLabel("4-digit PIN").fill("4321");
    await card.getByRole("button", { name: "I-save ang PIN" }).click();
    await expect(card.getByText("Na-save ang PIN mo!")).toBeVisible();
    await anaE.page.reload();
    await expect(anaE.page.getByRole("region", { name: "Mag-set ng PIN" })).toHaveCount(0);
    await anaE.context.close();

    // Phone A's cookie and the old link no longer work.
    await anaA.page.goto(`/g/${slug}/me`);
    await expect(anaA.page.getByText("Hindi ka pa namin kilala sa device na 'to.")).toBeVisible();
    await anaA.page.getByRole("link", { name: "Bumalik gamit ang PIN" }).click();
    await submitComeBack(anaA.page, "1234", "Ana");
    await expectWrong(anaA.page);
    await submitComeBack(anaA.page, "4321", "Ana");
    await expect(anaA.page.getByRole("heading", { name: "Hi, Ana!" })).toBeVisible();
    expect(anaLink).not.toBe(newLink);
  });

  await test.step("after the draw: joining closes, coming back still works, errors stay the same", async () => {
    const cris = await newPerson(browser, testInfo, "Cris");
    await joinWith(cris.page, shareUrl, "Cris", "3333");
    await expect(cris.page.getByRole("heading", { name: "Hi, Cris!" })).toBeVisible();
    await cris.context.close();

    const { page } = organizer;
    await page.goto(`/g/${slug}/admin`);
    await page.getByRole("button", { name: "Draw names" }).click();
    await page.getByRole("button", { name: "Oo, i-draw na" }).click();
    await expect(page.getByText("Names drawn")).toBeVisible();

    const late = await newPerson(browser, testInfo, "Ana (after draw)");
    const truth = await getTruth(slug);
    expectJoinPageClean(await capturePage(late.page, shareUrl), truth);
    await expect(late.page.getByText("Tapos na ang bunutan")).toBeVisible();
    await expect(late.page.getByLabel("4-digit PIN")).toHaveCount(0);
    await late.page.getByRole("link", { name: "Bumalik sa slip ko" }).click();
    await expect(late.page.getByRole("form", { name: "Bumalik" })).toBeVisible();
    // Closed: no "Bago ka?".
    await expect(late.page.getByText("Bago ka? Sumali dito")).toHaveCount(0);
    expectJoinPageClean(await late.page.content(), truth);

    const existing = await submitComeBack(late.page, "0000", "Ana");
    await expectWrong(late.page);
    const missing = await submitComeBack(late.page, "0000", "Dan");
    await expectWrong(late.page);
    expect(missing).toBe(existing);

    await submitComeBack(late.page, "4321", "ana");
    await expect(late.page.getByRole("heading", { name: "Hi, Ana!" })).toBeVisible();
    await expect(late.page.getByRole("button", { name: "Tap to open your bunutan" })).toBeVisible();
    await late.context.close();
  });

  await test.step("no console errors on any page", async () => {
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
