/**
 * Main flow, end to end, on a phone: create → join (x3) → personal link →
 * organizer page → remove member → access checks.
 *
 * Each person has their own browser context (own cookies), like separate
 * phones. Runs against `next dev` and the DEV database; test groups are
 * deleted afterwards.
 */
import { mkdirSync } from "node:fs";
import { expect, test, type Browser, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
import { addDays, todayIn } from "../lib/theme-weeks";
import { closeDb } from "../server/db";
import { deleteGroups, E2E_PREFIX } from "./db-cleanup";

const createdSlugs: string[] = [];

test.afterAll(async () => {
  await deleteGroups(createdSlugs);
  await closeDb();
});

// --- Helpers -----------------------------------------------------------------

interface Person {
  label: string;
  context: BrowserContext;
  page: Page;
}

/** Console errors and uncaught exceptions, per person, collected all test long. */
const problems: string[] = [];

function watch(page: Page, label: string) {
  page.on("console", (msg) => {
    if (msg.type() === "error") problems.push(`[${label}] console.error on ${page.url()}: ${msg.text()}`);
  });
  page.on("pageerror", (error) => {
    problems.push(`[${label}] uncaught error on ${page.url()}: ${error.message}`);
  });
}

/** A new "phone": fresh context with the project's device settings. */
async function newPerson(browser: Browser, testInfo: TestInfo, label: string): Promise<Person> {
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
  const page = await context.newPage();
  watch(page, label);
  return { label, context, page };
}

function screenshotter(testInfo: TestInfo) {
  const dir = `e2e/screenshots/${testInfo.project.name}`;
  mkdirSync(dir, { recursive: true });
  let n = 0;
  return async (page: Page, name: string) => {
    n += 1;
    await page.screenshot({ path: `${dir}/${String(n).padStart(2, "0")}-${name}.png`, fullPage: true });
  };
}

/** The selectable link text in a LinkBox, once it has become an absolute URL. */
async function readLink(page: Page, pattern: RegExp): Promise<string> {
  const box = page.locator("p.select-all").filter({ hasText: pattern });
  await expect(box).toHaveText(/^https?:\/\//);
  return (await box.textContent())!.trim();
}

async function join(page: Page, shareUrl: string, name: string) {
  await page.goto(shareUrl);
  await page.getByLabel("Pangalan mo").fill(name);
  await page.getByRole("button", { name: "Join the group" }).click();
}

// --- The flow ----------------------------------------------------------------

test("main flow: create, join, personal links, organizer, remove", async ({ browser }, testInfo) => {
  const shot = screenshotter(testInfo);
  const groupName = `${E2E_PREFIX}Barkada (${testInfo.project.name})`;
  const partyDate = addDays(todayIn("Asia/Manila"), 40);

  const organizer = await newPerson(browser, testInfo, "organizer");
  let shareUrl = "";
  let organizerUrl = "";
  let slug = "";

  await test.step("home → Create your group → /new", async () => {
    const { page } = organizer;
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Monito Monita" })).toBeVisible();
    await shot(page, "home");
    await page.getByRole("link", { name: "Create your group" }).click();
    await expect(page).toHaveURL(/\/new$/);
    await expect(page.getByRole("heading", { name: "Create your group" })).toBeVisible();
  });

  await test.step("submitting empty shows field errors", async () => {
    const { page } = organizer;
    await page.getByRole("button", { name: "Create group" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("May kulang o mali sa form");
    await expect(page.getByText("Pakilagay ang pangalan ng group.")).toBeVisible();
    await expect(page.getByText("Pakilagay ang budget (₱1 pataas).")).toBeVisible();
    await expect(page.getByText("Pakipili ang party date.")).toBeVisible();
    await shot(page, "new-empty-errors");

    // What you typed survives a failed submit (regression: WebKit cleared it).
    await page.getByLabel("Group name").fill(groupName);
    await page.getByRole("button", { name: "Create group" }).click();
    await expect(page.getByText("Pakilagay ang pangalan ng group.")).toHaveCount(0);
    await expect(page.getByText("Pakilagay ang budget (₱1 pataas).")).toBeVisible();
    await expect(page.getByLabel("Group name")).toHaveValue(groupName);
  });

  await test.step("create a group with edited themes", async () => {
    const { page } = organizer;
    await page.getByLabel("Group name").fill(groupName);
    await page.getByLabel("Budget per gift").fill("500");
    await page.getByLabel("Party date").fill(partyDate);

    await page.getByRole("textbox", { name: "Theme 2", exact: true }).fill("Something green");
    await page.getByRole("button", { name: "Remove theme 4" }).click();
    await page.getByRole("button", { name: "Add a theme" }).click();
    await page.getByRole("textbox", { name: "Theme 4", exact: true }).fill("Something handmade");
    await expect(page.getByLabel(/^Theme \d$/)).toHaveCount(4);
    await expect(page.getByText(/^Starts [A-Z][a-z]{2} \d{1,2}$/)).toHaveCount(4);
    await shot(page, "new-filled");

    await page.getByRole("button", { name: "Create group" }).click();
    await expect(page.getByRole("heading", { name: "Ready na ang group mo!" })).toBeVisible();
    await expect(page.getByText("Ito ang susi mo bilang organizer.")).toBeVisible();

    shareUrl = await readLink(page, /\/g\/[a-z0-9]+$/);
    organizerUrl = await readLink(page, /\/admin\?t=/);
    slug = new URL(shareUrl).pathname.split("/")[2];
    createdSlugs.push(slug);
    expect(organizerUrl).toContain(`/g/${slug}/admin?t=`);
    await shot(page, "group-created");
  });

  const joy = await newPerson(browser, testInfo, "Joy");
  await test.step("Joy joins via the share link and lands on /me", async () => {
    const { page } = joy;
    await page.goto(shareUrl);
    await expect(page.getByRole("heading", { name: groupName })).toBeVisible();
    await expect(page.getByText("Wala pang sumali")).toBeVisible();
    await shot(page, "join-page");

    await page.getByLabel("Pangalan mo").fill("Joy");
    await page.getByRole("button", { name: "Join the group" }).click();
    await expect(page).toHaveURL(new RegExp(`/g/${slug}/me\\?welcome=1$`));
    await expect(page.getByRole("heading", { name: "Hi, Joy!" })).toBeVisible();
    await expect(page.getByText("Save this link!")).toBeVisible();
    await expect(page.getByText("Waiting for the bunutan…")).toBeVisible();
    await readLink(page, /\/me\?t=/);
    await shot(page, "joy-me-welcome");
  });

  const joyM = await newPerson(browser, testInfo, "Joy M");
  await test.step("'joy' is a duplicate; joins as 'Joy M' instead", async () => {
    const { page } = joyM;
    await join(page, shareUrl, "joy");
    await expect(page.locator("main").getByRole("alert")).toHaveText("May joy na. Dagdagan ng initial ng apelyido mo.");
    await expect(page.getByLabel("Pangalan mo")).toHaveValue("joy");
    await shot(page, "duplicate-name");

    await page.getByLabel("Pangalan mo").fill("Joy M");
    await page.getByRole("button", { name: "Join the group" }).click();
    await expect(page.getByRole("heading", { name: "Hi, Joy M!" })).toBeVisible();
  });

  let marco = await newPerson(browser, testInfo, "Marco");
  let marcoLink = "";
  await test.step("Marco joins, closes the browser, comes back with his link", async () => {
    await join(marco.page, shareUrl, "Marco");
    await expect(marco.page.getByRole("heading", { name: "Hi, Marco!" })).toBeVisible();
    marcoLink = await readLink(marco.page, /\/me\?t=/);
    await marco.context.close();

    marco = await newPerson(browser, testInfo, "Marco (new phone)");
    await marco.page.goto(marcoLink);
    // The token is swapped for a cookie and removed from the URL.
    await expect(marco.page).toHaveURL(new RegExp(`/g/${slug}/me$`));
    await expect(marco.page.getByRole("heading", { name: "Hi, Marco!" })).toBeVisible();
    await expect(marco.page.getByText("Your personal link")).toBeVisible();
    await shot(marco.page, "marco-back-via-link");
  });

  await test.step("organizer page lists everyone; 'Kasali ka rin ba?' works", async () => {
    const { page } = organizer;
    await page.goto(organizerUrl);
    await expect(page).toHaveURL(new RegExp(`/g/${slug}/admin$`));
    await expect(page.getByRole("heading", { name: groupName })).toBeVisible();
    for (const name of ["Joy", "Joy M", "Marco"]) {
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }
    await expect(page.getByText("3 na ang sumali").first()).toBeVisible();
    await expect(page.getByText(/^Joined [A-Z][a-z]{2} \d{1,2}, \d{1,2}:\d{2} [AP]M$/)).toHaveCount(3);
    await expect(page.getByText("Kasali ka rin ba?")).toBeVisible();
    await shot(page, "admin-with-hint");

    await page.getByRole("link", { name: "Join as a member" }).click();
    await expect(page).toHaveURL(new RegExp(`/g/${slug}$`));
    await page.getByLabel("Pangalan mo").fill("Tita Org");
    await page.getByRole("button", { name: "Join the group" }).click();
    await expect(page.getByRole("heading", { name: "Hi, Tita Org!" })).toBeVisible();

    await page.goto(`/g/${slug}/admin`);
    await expect(page.getByText("4 na ang sumali").first()).toBeVisible();
    await expect(page.getByText("Kasali ka rin ba?")).toHaveCount(0);
    await shot(page, "admin-after-organizer-joined");
  });

  await test.step("organizer removes Marco; his link stops working", async () => {
    const { page } = organizer;
    await page.getByRole("button", { name: "Remove Marco" }).click();
    await expect(page.getByText("Tanggalin si Marco sa group?")).toBeVisible();
    await shot(page, "remove-confirm");
    await page.getByRole("button", { name: "Oo, tanggalin" }).click();
    await expect(page.getByText("Marco", { exact: true })).toHaveCount(0);
    await expect(page.getByText("3 na ang sumali").first()).toBeVisible();
    await shot(page, "admin-after-remove");

    // Marco's existing cookie no longer works…
    await marco.page.reload();
    await expect(marco.page.getByText("Hindi ka pa namin kilala sa device na 'to.")).toBeVisible();
    // …and neither does his personal link on yet another phone.
    const marco3 = await newPerson(browser, testInfo, "Marco (third phone)");
    await marco3.page.goto(marcoLink);
    await expect(marco3.page).toHaveURL(new RegExp(`/g/${slug}/me$`));
    await expect(marco3.page.getByText("Hindi ka pa namin kilala sa device na 'to.")).toBeVisible();
    await shot(marco3.page, "marco-link-dead");
  });

  await test.step("a member cookie can't open the organizer page", async () => {
    const { page } = joy;
    await page.goto(`/g/${slug}/admin`);
    await expect(page.getByText("Para sa organizer lang ang page na 'to.")).toBeVisible();
    await expect(page.getByText("Joy M", { exact: true })).toHaveCount(0);
    await shot(page, "member-blocked-from-admin");
  });

  await test.step("an unknown group link shows not found", async () => {
    const { page } = joy;
    await page.goto("/g/zzzzzzzzzzzz");
    await expect(page.getByText("This page could not be found.")).toBeVisible();
    await shot(page, "unknown-group");
  });

  await test.step("no console errors on any page", async () => {
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
