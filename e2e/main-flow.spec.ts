/**
 * Main flow, end to end, on a phone: create → join (x3) → personal link →
 * organizer page → remove member → access checks.
 *
 * Each person has their own browser context (own cookies), like separate
 * phones. Runs against `next dev` and the DEV database; test groups are
 * deleted afterwards.
 */
import { mkdirSync, rmSync } from "node:fs";
import { expect, test, type Browser, type BrowserContext, type Page, type Response, type TestInfo } from "@playwright/test";
import { formatPartyDate } from "../lib/format";
import { addDays, todayIn } from "../lib/theme-weeks";
import { closeDb } from "../server/db";
import { deleteGroups, E2E_PREFIX } from "./db-cleanup";
import { capturePage, expectJoinPageClean, expectMemberPageClean, expectOrganizerPageClean, getTruth } from "./leak";

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
  // Chromium needs permission to read the clipboard back in tests.
  if (browser.browserType().name() === "chromium") {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  }
  const page = await context.newPage();
  watch(page, label);
  return { label, context, page };
}

function screenshotter(testInfo: TestInfo) {
  const dir = `e2e/screenshots/${testInfo.project.name}`;
  // Start fresh so old runs with different step numbers do not linger.
  rmSync(dir, { recursive: true, force: true });
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

// --- The slip (signature moment #3) ----------------------------------------

const tapToOpen = (page: Page) => page.getByRole("button", { name: "Tap to open your bunutan" });

/** The name written on the open slip ("~ Ate Joy ~" → "Ate Joy"). */
async function readSlipName(page: Page): Promise<string> {
  const text = await page.locator('section[aria-label="Your monito"] [data-part="name-inner"]').textContent();
  return text!.replace(/\u00a0/g, " ").replace(/~/g, "").trim();
}

/** Taps the folded slip, waits for the unfold and the save, returns the name. */
async function openSlip(page: Page): Promise<string> {
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
function watchForGsap(page: Page) {
  const seen = { gsap: false };
  page.on("response", async (r) => {
    if (!/\.js(\?|$)/.test(r.url())) return;
    const body = await r.text().catch(() => "");
    if (body.includes("GreenSock")) seen.gsap = true;
  });
  return seen;
}

/** The organizer page's cards appear in exactly this order (by card title). */
async function expectCardOrder(page: Page, titles: string[]) {
  const all = await page.locator('[data-slot="card-title"]').allTextContents();
  const positions = titles.map((t) => all.findIndex((text) => text.trim() === t));
  for (const [i, t] of titles.entries()) expect(positions[i], `card "${t}" is on the page`).toBeGreaterThanOrEqual(0);
  expect(positions, `cards in order: ${titles.join(" → ")}`).toEqual([...positions].sort((a, b) => a - b));
}

async function join(page: Page, shareUrl: string, name: string, pin = "1234") {
  await page.goto(shareUrl);
  await page.getByLabel("Pangalan mo").fill(name);
  await page.getByLabel("PIN (4 digits)").fill(pin);
  await page.getByRole("button", { name: "Join the group" }).click();
}

// --- The flow ----------------------------------------------------------------

test("main flow: create, join, organizer, exclusions, draw, results, leaks", async ({ browser }, testInfo) => {
  const shot = screenshotter(testInfo);
  const groupName = `${E2E_PREFIX}Barkada (${testInfo.project.name})`;
  const partyDate = addDays(todayIn("Asia/Manila"), 40);

  const organizer = await newPerson(browser, testInfo, "organizer");
  let shareUrl = "";
  let organizerUrl = "";
  let joyLink = "";
  let joyMLink = "";
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

    // Editing a field clears its error right away; others stay.
    await page.getByLabel("Group name").fill(groupName);
    await expect(page.getByText("Pakilagay ang pangalan ng group.")).toHaveCount(0);
    await expect(page.getByText("Pakilagay ang budget (₱1 pataas).")).toBeVisible();

    // What you typed survives a failed submit (regression: WebKit cleared it).
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
    // The PIN is required, on a numeric keypad.
    await page.getByRole("button", { name: "Join the group" }).click();
    await expect(page.locator("main").getByRole("alert")).toHaveText("Pakilagay ang 4-digit PIN.");
    await expect(page.getByLabel("PIN (4 digits)")).toHaveAttribute("inputmode", "numeric");
    await page.getByLabel("PIN (4 digits)").fill("1234");
    await page.getByRole("button", { name: "Join the group" }).click();
    await expect(page.getByRole("heading", { name: "Hi, Joy!" })).toBeVisible();
    await expect(page.getByText("Save this link!")).toBeVisible();
    // The welcome highlight stays, but ?welcome=1 is replaced away (no reload).
    await expect(page).toHaveURL(new RegExp(`/g/${slug}/me$`));
    await expect(page.getByText("Save this link!")).toBeVisible();
    // Member only: no role switch.
    await expect(page.getByRole("navigation", { name: "Switch view" })).toHaveCount(0);
    await expect(page.getByText("Waiting for the bunutan…")).toBeVisible();
    joyLink = await readLink(page, /\/me\?t=/);
    await shot(page, "joy-me-welcome");
  });

  const joyM = await newPerson(browser, testInfo, "Joy M");
  await test.step("'joy' is taken: the come-back form, then 'Bago ako' → joins as 'Joy M'", async () => {
    const { page } = joyM;
    await join(page, shareUrl, "joy", "5678");
    // Nothing created; neutral wording that doesn't repeat the name.
    await expect(
      page.getByText(
        "Kung kasali ka na, ilagay ang PIN mo. Kung bago ka, gumamit ng ibang pangalan (dagdagan ng initial ng apelyido).",
      ),
    ).toBeVisible();
    await expect(page.getByRole("form", { name: "Bumalik" })).toBeVisible();
    await expect(page.getByLabel("Pangalan mo")).toHaveCount(0);
    await expect(page.getByText(/joy/i)).toHaveCount(0);
    await shot(page, "name-taken-come-back");

    await page.getByRole("button", { name: "Bago ako" }).click();
    await expect(page.getByLabel("Pangalan mo")).toHaveValue("joy");
    await page.getByLabel("Pangalan mo").fill("Joy M");
    await page.getByLabel("PIN (4 digits)").fill("5678");
    await page.getByRole("button", { name: "Join the group" }).click();
    await expect(page.getByRole("heading", { name: "Hi, Joy M!" })).toBeVisible();
    joyMLink = await readLink(page, /\/me\?t=/);
  });

  await test.step("someone else's link on a logged-in phone asks before switching", async () => {
    const { page } = joy;
    const question = (current: string, other: string) =>
      page.getByText(`Naka-login ka bilang ${current} sa device na 'to. Ikaw ba talaga si ${other}?`);

    // Joy's phone opens Joy M's link: asked first, and staying is the main button.
    await page.goto(joyMLink);
    await expect(page).toHaveURL(new RegExp(`/g/${slug}/me$`));
    await expect(question("Joy", "Joy M")).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Hi, / })).toHaveCount(0);
    await shot(page, "switch-confirm");
    await page.getByRole("button", { name: "Stay as Joy", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Hi, Joy!" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Hi, Joy!" })).toBeVisible();
    await expect(question("Joy", "Joy M")).toHaveCount(0);

    // Confirming switches the phone to Joy M…
    await page.goto(joyMLink);
    await page.getByRole("button", { name: "Oo, ako si Joy M", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Hi, Joy M!" })).toBeVisible();

    // …and Joy's own link brings her back, with the same question.
    await page.goto(joyLink);
    await expect(question("Joy M", "Joy")).toBeVisible();
    await page.getByRole("button", { name: "Oo, ako si Joy", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Hi, Joy!" })).toBeVisible();
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
      await expect(page.getByRole("list", { name: "Members" }).getByText(name, { exact: true })).toBeVisible();
    }
    await expect(page.getByText("3 na ang sumali").first()).toBeVisible();
    await expect(page.getByText(/^Joined [A-Z][a-z]{2} \d{1,2}, \d{1,2}:\d{2} [AP]M$/)).toHaveCount(3);
    await expect(page.getByText("Kasali ka rin ba?")).toBeVisible();
    await shot(page, "admin-with-hint");

    await page.getByRole("link", { name: "Join as a member" }).click();
    await expect(page).toHaveURL(new RegExp(`/g/${slug}$`));
    await page.getByLabel("Pangalan mo").fill("Tita Org");
    await page.getByLabel("PIN (4 digits)").fill("2580");
    await page.getByRole("button", { name: "Join the group" }).click();
    await expect(page.getByRole("heading", { name: "Hi, Tita Org!" })).toBeVisible();

    await page.goto(`/g/${slug}/admin`);
    await expect(page.getByText("4 na ang sumali").first()).toBeVisible();
    await expect(page.getByText("Kasali ka rin ba?")).toHaveCount(0);
    await shot(page, "admin-after-organizer-joined");
  });

  await test.step("organizer + member: switch between 'Manage group' and 'My slip'", async () => {
    const { page } = organizer;
    const nav = page.getByRole("navigation", { name: "Switch view" });
    await expect(nav.getByRole("link", { name: "Manage group" })).toHaveAttribute("aria-current", "page");
    await nav.getByRole("link", { name: "My slip" }).click();
    await expect(page).toHaveURL(new RegExp(`/g/${slug}/me$`));
    await expect(page.getByRole("heading", { name: "Hi, Tita Org!" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "My slip" })).toHaveAttribute("aria-current", "page");
    await shot(page, "role-switch-me");
    await nav.getByRole("link", { name: "Manage group" }).click();
    await expect(page).toHaveURL(new RegExp(`/g/${slug}/admin$`));
    await expect(page.getByRole("heading", { name: groupName })).toBeVisible();
  });

  await test.step("organizer removes Marco; his link stops working", async () => {
    const { page } = organizer;
    await page.getByRole("button", { name: "Remove Marco" }).click();
    await expect(page.getByText("Tanggalin si Marco sa group?")).toBeVisible();
    await shot(page, "remove-confirm");
    await page.getByRole("button", { name: "Oo, tanggalin" }).click();
    await expect(page.getByRole("list", { name: "Members" }).getByText("Marco", { exact: true })).toHaveCount(0);
    await expect(page.getByText("3 na ang sumali").first()).toBeVisible();
    await shot(page, "admin-after-remove");

    // On Marco's phone: told he was removed, with no way to rejoin from there…
    await marco.page.reload();
    await expect(marco.page.getByText("Tinanggal ka ng organizer sa group na 'to.")).toBeVisible();
    await expect(marco.page.getByText("Kung mali ito, kausapin ang organizer.")).toBeVisible();
    await expect(marco.page.getByRole("link", { name: "Join the group" })).toHaveCount(0);
    await shot(marco.page, "marco-removed-notice");
    await marco.page.goto(shareUrl);
    await expect(marco.page.getByText("Tinanggal ka ng organizer sa group na 'to.")).toBeVisible();
    await expect(marco.page.getByLabel("Pangalan mo")).toHaveCount(0);
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

  // --- Exclusions, draw, results, leaks, redraw ------------------------------

  const ben = await newPerson(browser, testInfo, "Ben");
  let benLink = "";
  await test.step("Ben joins (4 active members: Joy, Joy M, Tita Org, Ben)", async () => {
    await join(ben.page, shareUrl, "Ben");
    await expect(ben.page.getByRole("heading", { name: "Hi, Ben!" })).toBeVisible();
    benLink = await readLink(ben.page, /\/me\?t=/);
  });

  // Wishlists. Titles are unique and contain no member names (leak checks).
  const wishesByName: Record<string, string[]> = {
    Joy: ["Mug na cute (blue)", "Plant (small lang)"],
    "Joy M": ["Notebook"],
    Ben: ["Socks"],
    "Tita Org": [],
  };

  async function addWish(page: Page, title: string, url = "", note = "") {
    await page.getByRole("button", { name: "Add an item" }).click();
    await page.getByLabel("Ano ang gusto mo?").fill(title);
    if (url) await page.getByLabel("Link (optional)").fill(url);
    if (note) await page.getByLabel("Note (optional)").fill(note);
    await page.getByRole("button", { name: "Add to wishlist" }).click();
    await expect(page.getByRole("list", { name: "Wishlist mo" }).getByText(title, { exact: true })).toBeVisible();
  }

  await test.step("wishlists: empty state, add, edit (before the draw)", async () => {
    await organizer.page.goto(`/g/${slug}/me`);
    await expect(
      organizer.page.getByText("Wala pang wishlist. Add something para hindi mahirapan ang monito mo."),
    ).toBeVisible();

    const { page } = joy;
    await page.goto(`/g/${slug}/me`);
    await addWish(page, "Mug na cute", "www.example.com/mug", "Kahit anong kulay");
    const myList = page.getByRole("list", { name: "Wishlist mo" });
    const link = myList.getByRole("link", { name: /example\.com/ });
    await expect(link).toHaveAttribute("href", "https://www.example.com/mug");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer nofollow");
    await expect(myList.getByText("Kahit anong kulay")).toBeVisible();

    await page.getByRole("button", { name: "Edit Mug na cute" }).click();
    await page.getByLabel("Ano ang gusto mo?").fill("Mug na cute (blue)");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(myList.getByText("Mug na cute (blue)", { exact: true })).toBeVisible();
    await addWish(page, "Plant (small lang)");
    await shot(page, "joy-wishlist");

    // A bad link is rejected with a clear message.
    await page.getByRole("button", { name: "Add an item" }).click();
    await page.getByLabel("Ano ang gusto mo?").fill("Sketchy");
    await page.getByLabel("Link (optional)").fill("javascript:alert(1)");
    await page.getByRole("button", { name: "Add to wishlist" }).click();
    await expect(page.getByText("Hindi valid ang link. Dapat http o https.")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();

    await joyM.page.goto(`/g/${slug}/me`);
    await addWish(joyM.page, "Notebook");
    await ben.page.goto(`/g/${slug}/me`);
    await addWish(ben.page, "Socks");
  });

  /** Checks the GC reminder preview and that Copy copies exactly that text. */
  async function checkReminder(expected: (string | RegExp)[], absent: string[] = []) {
    const { page } = organizer;
    const preview = page.getByLabel("Reminder preview");
    // Copy is enabled once the browser has filled in the full share link.
    await expect(page.getByRole("button", { name: "Copy reminder" })).toBeEnabled();
    for (const text of expected) await expect(preview).toContainText(text);
    for (const text of absent) await expect(preview).not.toContainText(text);
    await page.getByRole("button", { name: "Copy reminder" }).click();
    await expect(page.getByRole("button", { name: "Copied!" })).toBeVisible();
    if (browser.browserType().name() === "chromium") {
      // The Windows clipboard turns \n into \r\n; compare the text itself.
      const copied = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n");
      expect(copied).toBe(await preview.textContent());
    }
  }

  await test.step("GC reminder before the draw: invite, link, count, party date", async () => {
    await organizer.page.goto(`/g/${slug}/admin`);
    // Before the draw: share link and Draw near the top, the rest below.
    await expectCardOrder(organizer.page, [
      "Share link (para sa GC)",
      "Bunutan",
      "Bawal magkabunot",
      "Members",
      "Reminder para sa GC",
    ]);
    await expect(organizer.page.getByRole("group", { name: "Reminder type" })).toHaveCount(0);
    await checkReminder([
      "Sali na sa exchange gift natin! 🎄",
      `👉 ${shareUrl}`,
      "4 na ang sumali.",
      `Party: ${formatPartyDate(partyDate)} 🎉`,
      "Budget: ₱500",
    ]);
    await shot(organizer.page, "reminder-before-draw");
  });

  await test.step("theme weeks on /me (before the first theme)", async () => {
    // Party in 40 days with 4 weekly themes → the first starts in 12 days.
    const firstStart = addDays(partyDate, -28);
    const card = joy.page.getByRole("region", { name: "Theme this week" });
    await expect(card.getByText("Unang theme: Something soft")).toBeVisible();
    await expect(card.getByText(`Magsisimula sa 12 araw, ${formatPartyDate(firstStart)}`)).toBeVisible();
    await expect(card.getByText("First theme: Something soft · Budget ₱500")).toBeVisible();
  });

  const pairList = () => organizer.page.getByRole("list", { name: "Exclusion pairs" });
  const warning = () => organizer.page.locator("main").getByRole("alert");

  async function addPair(first: string, second: string) {
    const { page } = organizer;
    await page.getByLabel("Unang tao").selectOption({ label: first });
    await page.getByLabel("Pangalawang tao").selectOption({ label: second });
    await page.getByRole("button", { name: "Add pair" }).click();
  }

  await test.step("add an exclusion pair (Joy & Joy M)", async () => {
    const { page } = organizer;
    await page.goto(`/g/${slug}/admin`);
    await expect(page.getByText("Bawal magkabunot")).toBeVisible();
    await expect(page.getByText("Wala pang bawal.")).toBeVisible();
    await addPair("Joy", "Joy M");
    await expect(pairList().getByRole("listitem")).toHaveCount(1);
    await expect(pairList()).toContainText(/Joy & Joy M|Joy M & Joy/);
    await expect(warning()).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Draw names" })).toBeEnabled();
    await shot(page, "exclusion-added");
  });

  await test.step("an impossible setup is flagged right away", async () => {
    const { page } = organizer;
    await addPair("Joy", "Tita Org");
    await expect(pairList().getByRole("listitem")).toHaveCount(2);
    await expect(warning()).toHaveText("Masyadong maraming bawal kay Joy. Tanggalin ang isa sa mga pair niya.");
    await expect(page.getByRole("button", { name: "Draw names" })).toBeDisabled();
    await expect(page.getByText("Ayusin muna ang mga bawal sa baba.")).toBeVisible();
    await shot(page, "exclusion-impossible");

    await page.getByRole("button", { name: /Remove pair (Joy and Tita Org|Tita Org and Joy)/ }).click();
    await expect(pairList().getByRole("listitem")).toHaveCount(1);
    await expect(warning()).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Draw names" })).toBeEnabled();
  });

  await test.step("draw names (confirm; a double click still draws once)", async () => {
    const { page } = organizer;
    await page.getByRole("button", { name: "Draw names" }).click();
    await expect(page.getByText("Pag na-draw na, sarado na ang sali. Sure na?")).toBeVisible();
    await shot(page, "draw-confirm");
    await page.getByRole("button", { name: "Oo, i-draw na" }).dblclick();
    await expect(page.getByText("Names drawn")).toBeVisible();
    await expect(page.getByText("4 na ang may monito.", { exact: false })).toBeVisible();
    await expect(page.getByText("Na-draw na ang names")).toBeVisible();

    // Right after the draw: next steps first, then the draw status, members lower.
    await expect(page.getByText("0 of 4 have opened their slip")).toBeVisible();
    await expectCardOrder(page, ["Na-draw na! I-announce sa GC", "Bunutan", "Members", "Share link (para sa GC)"]);
    await expect(page.getByText("Reminder para sa GC", { exact: true })).toHaveCount(0);
    // The organizer is a member too, with an unopened slip.
    await expect(page.getByRole("link", { name: "Buksan ang slip mo" })).toHaveAttribute("href", `/g/${slug}/me`);
    // "Na-draw na!" is the default GC message…
    const kind = page.getByRole("group", { name: "Reminder type" });
    await expect(kind.getByRole("button", { name: "Na-draw na" })).toHaveAttribute("aria-pressed", "true");
    await checkReminder(
      [
        "Na-draw na! Buksan ang link mo para makita ang monito mo 🎁",
        `🎉 Party: ${formatPartyDate(partyDate)}`,
        "💸 Budget: ₱500",
      ],
      [shareUrl, "Unang theme"],
    );
    await shot(page, "names-drawn-next-steps");
    // …with an easy switch to the theme reminder.
    await kind.getByRole("button", { name: "Theme reminder" }).click();
    await checkReminder(
      [
        "reminder!",
        `✨ Unang theme: Something soft, simula ${formatPartyDate(addDays(partyDate, -28))}`,
        "💸 Budget: ₱500",
        "Na-update n'yo na ba ang wishlist n'yo?",
      ],
      [shareUrl],
    );
    // Exclusions are locked now (members can still be removed, with a patch).
    await expect(page.getByRole("button", { name: "Add pair" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Remove pair/ })).toHaveCount(0);
    await shot(page, "names-drawn");

    const truth = await getTruth(slug);
    expect(truth.pairs).toHaveLength(4);
  });

  const everyone = [
    { label: "Joy", person: joy },
    { label: "Joy M", person: joyM },
    { label: "Tita Org", person: organizer },
    { label: "Ben", person: ben },
  ];

  /** Opens each member's /me and checks one receiver, a valid loop, and exclusions. */
  async function checkResults(shotName: string) {
    const seen = new Map<string, string>();
    for (const { label, person } of everyone) {
      const { page } = person;
      await page.goto(`/g/${slug}/me`);
      // A folded slip first; the wishlist waits until it's unfolded.
      await expect(tapToOpen(page)).toBeVisible();
      await expect(page.getByText(/^Wishlist ni /)).toHaveCount(0);
      if (label === "Joy") await shot(page, `${shotName}-folded`);
      const receiverName = await openSlip(page);
      await expect(page.getByText("Ang monito mo ay…")).toBeVisible();
      seen.set(label, receiverName);

      // The receiver's wishlist (latest version) shows under the slip.
      const theirWishes = wishesByName[receiverName];
      await expect(page.getByText(`Wishlist ni ${receiverName}`)).toBeVisible();
      if (theirWishes.length === 0) {
        await expect(page.getByText(`Wala pang wishlist si ${receiverName}.`, { exact: false })).toBeVisible();
      } else {
        const list = page.getByRole("list", { name: "Wishlist ng monito mo" });
        await expect(list.getByRole("listitem")).toHaveCount(theirWishes.length);
        for (const title of theirWishes) await expect(list.getByText(title, { exact: true })).toBeVisible();
      }
      if (label === "Joy") await shot(page, shotName);
    }

    // Matches the database, and forms one valid loop.
    const truth = await getTruth(slug);
    const nameOf = new Map(truth.members.map((m) => [m.id, m.name]));
    const expected = new Map(truth.pairs.map((p) => [nameOf.get(p.giverId)!, nameOf.get(p.receiverId)!]));
    expect(seen).toEqual(expected);
    expect(new Set(seen.values()).size).toBe(4);
    for (const [giver, receiver] of seen) expect(receiver).not.toBe(giver);
    let current = "Joy";
    for (let i = 0; i < 4; i++) current = seen.get(current)!;
    expect(current, "one loop through all 4").toBe("Joy");
    // The excluded pair didn't draw each other.
    expect(seen.get("Joy")).not.toBe("Joy M");
    expect(seen.get("Joy M")).not.toBe("Joy");
    return seen;
  }

  let firstDraw = new Map<string, string>();
  await test.step("each member sees exactly one receiver; exclusions held", async () => {
    firstDraw = await checkResults("joy-sees-monito");
  });

  await test.step("the slip unfolds once: later visits show it open, without GSAP", async () => {
    const { page } = joy;
    const loads = watchForGsap(page);
    await page.reload();
    await expect(page.getByText("Ang monito mo ay…")).toBeVisible();
    await expect(page.getByText(/^Wishlist ni /)).toBeVisible();
    await expect(tapToOpen(page)).toHaveCount(0);
    expect(await readSlipName(page)).toBe(firstDraw.get("Joy"));
    await page.waitForLoadState("networkidle");
    expect(loads.gsap, "GSAP downloaded for an already-open slip").toBe(false);

    // The organizer sees a count, never who.
    await organizer.page.goto(`/g/${slug}/admin`);
    await expect(organizer.page.getByText("4 of 4 have opened their slip")).toBeVisible();
    // Most have opened: the next steps give way to the usual layout, and the
    // theme reminder is the default again.
    await expect(organizer.page.getByText("Na-draw na! I-announce sa GC")).toHaveCount(0);
    await expect(organizer.page.getByRole("link", { name: "Buksan ang slip mo" })).toHaveCount(0);
    await expectCardOrder(organizer.page, ["Bunutan", "Reminder para sa GC", "Members", "Share link (para sa GC)"]);
    await expect(
      organizer.page.getByRole("group", { name: "Reminder type" }).getByRole("button", { name: "Theme reminder" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(organizer.page.getByLabel("Reminder preview")).toContainText("Na-update n'yo na ba ang wishlist n'yo?");
    await shot(organizer.page, "admin-most-opened");
  });

  await test.step("home page: 'Your groups' on this device, dead groups dropped", async () => {
    // Joy: member only. A stale entry for a group that doesn't exist goes away.
    const { page } = joy;
    await page.goto("/");
    const storedRoles = () =>
      page.evaluate(
        (slug) => JSON.parse(localStorage.getItem("mm:groups") ?? "[]").find((g: { slug: string }) => g.slug === slug)?.roles,
        slug,
      );
    // A stale organizer role is dropped when /admin finds no valid organizer cookie.
    await page.evaluate((slug) => {
      const list = JSON.parse(localStorage.getItem("mm:groups") ?? "[]");
      for (const g of list) if (g.slug === slug) g.roles = ["organizer", "member"];
      localStorage.setItem("mm:groups", JSON.stringify(list));
    }, slug);
    expect(await storedRoles()).toEqual(["organizer", "member"]);
    await page.goto(`/g/${slug}/admin`);
    await expect(page.getByText("Para sa organizer lang ang page na 'to.")).toBeVisible();
    await expect.poll(storedRoles).toEqual(["member"]);

    await page.goto("/");
    await page.evaluate(() => {
      const list = JSON.parse(localStorage.getItem("mm:groups") ?? "[]");
      list.push({ slug: "zzzzzzzzzzzz", name: "Wala na 'to", roles: ["member"], seenAt: 1 });
      localStorage.setItem("mm:groups", JSON.stringify(list));
    });
    await page.reload();
    const yours = page.getByRole("region", { name: "Your groups" });
    const joyContinue = yours.getByRole("link", { name: `Continue: ${groupName}` });
    await expect(joyContinue).toContainText("member");
    await expect(joyContinue).not.toContainText("organizer");
    await expect(yours.getByText("Wala na 'to")).toHaveCount(0);
    const stored = await page.evaluate(() => localStorage.getItem("mm:groups") ?? "");
    expect(stored).not.toContain("zzzzzzzzzzzz");
    // Never a token on the device list.
    expect(stored).not.toMatch(/[A-Za-z0-9_-]{43}/);
    await shot(page, "home-your-groups");
    await joyContinue.click();
    await expect(page).toHaveURL(new RegExp(`/g/${slug}/me$`));

    // The organizer (also a member): both roles, and the link goes to Manage.
    await organizer.page.goto("/");
    const orgLink = organizer.page
      .getByRole("region", { name: "Your groups" })
      .getByRole("link", { name: `Continue: ${groupName}` });
    await expect(orgLink).toContainText("organizer, member");
    await orgLink.click();
    await expect(organizer.page).toHaveURL(new RegExp(`/g/${slug}/admin$`));
  });

  await test.step("joining is closed after the draw", async () => {
    const late = await newPerson(browser, testInfo, "Late Larry");
    await late.page.goto(shareUrl);
    await expect(late.page.getByText("Sarado na ang sali.")).toBeVisible();
    await expect(late.page.getByLabel("Pangalan mo")).toHaveCount(0);
    await expect(late.page.getByRole("link", { name: "Kasali ka na? Bumalik dito" })).toBeVisible();
    await shot(late.page, "join-closed");
    await late.context.close();
  });

  async function leakCheck(people = everyone) {
    const truth = await getTruth(slug);
    expectOrganizerPageClean(await capturePage(organizer.page, `/g/${slug}/admin`), truth);
    const stranger = await newPerson(browser, testInfo, "Stranger");
    expectJoinPageClean(await capturePage(stranger.page, shareUrl), truth);
    await stranger.context.close();
    for (const { label, person } of people) {
      expectMemberPageClean(await capturePage(person.page, `/g/${slug}/me`), truth, label);
    }
  }

  await test.step("leak test: no page exposes anyone else's pair (HTML + network)", async () => {
    await leakCheck();
  });

  await test.step("lost link: organizer gets Ben a new one; the old link and cookie stop working", async () => {
    const { page } = organizer;
    await page.goto(`/g/${slug}/admin`);
    await page.getByRole("button", { name: "Get new link for Ben" }).click();
    await expect(page.getByText("Hindi na gagana ang luma niyang link", { exact: false })).toBeVisible();
    await shot(page, "new-link-confirm");

    // The action's response carries the new link only: no pairs, no codenames.
    const truth = await getTruth(slug);
    const responses: Promise<string>[] = [];
    const onResponse = (r: Response) => {
      if (r.request().method() === "POST") responses.push(r.text().catch(() => ""));
    };
    page.on("response", onResponse);
    await page.getByRole("button", { name: "Oo, gumawa ng bago" }).click();
    const box = page.getByRole("group", { name: "New link for Ben" }).locator("p.select-all");
    await expect(box).toHaveText(new RegExp(`^https?://.+/g/${slug}/me\\?t=`));
    const newLink = (await box.textContent())!.trim();
    page.off("response", onResponse);
    expect(newLink).not.toBe(benLink);
    expectOrganizerPageClean((await Promise.all(responses)).join("\n"), truth);
    const benRow = page.getByRole("list", { name: "Members" }).getByRole("listitem").filter({ hasText: "Ben" });
    await expect(benRow.getByText("New link · not opened yet")).toBeVisible();
    // Only Ben's row carries a status.
    await expect(page.getByText(/^New link · /)).toHaveCount(1);
    await shot(page, "new-link-shown");

    // The organizer opens it on their own phone (logged in as Tita Org):
    // asked first; staying doesn't count as opened.
    await page.goto(newLink);
    await expect(page.getByText("Naka-login ka bilang Tita Org sa device na 'to. Ikaw ba talaga si Ben?")).toBeVisible();
    await page.getByRole("button", { name: "Stay as Tita Org", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Hi, Tita Org!" })).toBeVisible();
    await page.goto(`/g/${slug}/admin`);
    await expect(benRow.getByText("New link · not opened yet")).toBeVisible();

    // Ben's old cookie no longer works on his phone…
    await ben.page.goto(`/g/${slug}/me`);
    await expect(ben.page.getByText("Hindi ka pa namin kilala sa device na 'to.")).toBeVisible();
    // …nor does his old link on another phone.
    const oldLinkPhone = await newPerson(browser, testInfo, "Ben (old link)");
    await oldLinkPhone.page.goto(benLink);
    await expect(oldLinkPhone.page.getByText("Hindi ka pa namin kilala sa device na 'to.")).toBeVisible();
    await oldLinkPhone.context.close();

    // The new link works, and his slip is still open.
    await ben.page.goto(newLink);
    await expect(ben.page).toHaveURL(new RegExp(`/g/${slug}/me$`));
    await expect(ben.page.getByRole("heading", { name: "Hi, Ben!" })).toBeVisible();
    await expect(tapToOpen(ben.page)).toHaveCount(0);
    expect(await readSlipName(ben.page)).toBe(firstDraw.get("Ben"));

    // Now the organizer sees it was opened. Status only.
    await page.goto(`/g/${slug}/admin`);
    await expect(benRow.getByText("New link · opened")).toBeVisible();
    await shot(page, "new-link-opened");

    await leakCheck();
  });

  await test.step("redraw replaces everyone's monito", async () => {
    const { page } = organizer;
    await page.goto(`/g/${slug}/admin`);
    const before = (await getTruth(slug)).pairs.map((p) => p.id);
    await page.getByRole("button", { name: "Redraw" }).click();
    await expect(page.getByText("Magbabago ang monito ng lahat.")).toBeVisible();
    await shot(page, "redraw-confirm");
    await page.getByRole("button", { name: "Oo, i-redraw" }).click();
    await expect(page.getByText("Magbabago ang monito ng lahat.")).toHaveCount(0);
    await expect(page.getByText("Names drawn")).toBeVisible();
    // Everyone's monito changed, so everyone unfolds a new slip.
    await expect(page.getByText("0 of 4 have opened their slip")).toBeVisible();

    const after = await getTruth(slug);
    expect(after.pairs).toHaveLength(4);
    expect(after.pairs.some((p) => before.includes(p.id)), "all assignment rows replaced").toBe(false);

    // With 4 people and Joy–Joy M excluded, a redraw may land on the same
    // loop by chance; what matters is it's a fresh, valid draw.
    const secondDraw = await checkResults("joy-sees-monito-after-redraw");
    expect(secondDraw.size).toBe(firstDraw.size);
    await leakCheck();
  });

  // --- Remove after the draw ------------------------------------------------
  // With 4 people and Joy–Joy M excluded, the loop is always
  // Joy → x → Joy M → y → Joy (x, y = Tita Org and Ben). Removing Ben would
  // make Joy and Joy M draw each other; removing Joy can be patched.

  const memberList = () => organizer.page.getByRole("list", { name: "Members" });

  await test.step("remove after the draw: blocked when it would pair an excluded couple", async () => {
    const { page } = organizer;
    await page.goto(`/g/${slug}/admin`);
    await page.getByRole("button", { name: "Remove Ben", exact: true }).click();
    await expect(page.getByText("Ang nakabunot sa kanya ay bibigyan ng bagong monito", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Oo, tanggalin" }).click();
    await expect(page.locator("main").getByRole("alert")).toHaveText(
      "Kapag tinanggal si Ben, magkakabunot ang dalawang bawal. Kailangan ng redraw para matanggal siya.",
    );
    await expect(page.getByRole("button", { name: "Tanggalin at i-redraw" })).toBeVisible();
    await shot(page, "remove-needs-redraw");
    await page.getByRole("button", { name: "Huwag" }).click();
    await expect(memberList().getByText("Ben", { exact: true })).toBeVisible();
    expect((await getTruth(slug)).pairs).toHaveLength(4);
  });

  await test.step("remove Joy after the draw: only her giver's monito changes, with a notice", async () => {
    const before = await getTruth(slug);
    const nameOf = new Map(before.members.map((m) => [m.id, m.name]));
    const joyId = before.members.find((m) => m.name === "Joy")!.id;
    const giverName = nameOf.get(before.pairs.find((p) => p.receiverId === joyId)!.giverId)!;
    const newReceiver = nameOf.get(before.pairs.find((p) => p.giverId === joyId)!.receiverId)!;

    const { page } = organizer;
    await page.getByRole("button", { name: "Remove Joy", exact: true }).click();
    await page.getByRole("button", { name: "Oo, tanggalin" }).click();
    await expect(memberList().getByText("Joy", { exact: true })).toHaveCount(0);
    await expect(memberList().getByRole("listitem")).toHaveCount(3);
    await shot(page, "removed-after-draw");

    // Still one valid loop of 3, and the exclusion still holds.
    const after = await getTruth(slug);
    const afterName = new Map(after.members.map((m) => [m.id, m.name]));
    const loop = new Map(after.pairs.map((p) => [afterName.get(p.giverId)!, afterName.get(p.receiverId)!]));
    expect(loop.size).toBe(3);
    expect(loop.get(giverName)).toBe(newReceiver);
    expect(loop.get("Joy M")).not.toBe("Joy");

    const remaining = [
      { label: "Joy M", person: joyM },
      { label: "Tita Org", person: organizer },
      { label: "Ben", person: ben },
    ];
    for (const { label, person } of remaining) {
      const p = person.page;
      await p.goto(`/g/${slug}/me`);
      const notice = p.getByText("Na-update ang monito mo");
      if (label === giverName) {
        // New monito: the notice, and a new folded slip to unfold.
        await expect(notice).toBeVisible();
        await shot(p, "monito-updated-notice");
        expect(await openSlip(p)).toBe(loop.get(label));
        await p.getByRole("button", { name: "Okay, gets ko" }).click();
        await expect(notice).toHaveCount(0);
        await p.reload();
        await expect(p.getByText("Ang monito mo ay…")).toBeVisible();
        await expect(tapToOpen(p)).toHaveCount(0);
        expect(await readSlipName(p)).toBe(loop.get(label));
        await expect(notice).toHaveCount(0);
      } else {
        // Same monito as before: still open.
        await expect(p.getByText("Ang monito mo ay…")).toBeVisible();
        await expect(tapToOpen(p)).toHaveCount(0);
        expect(await readSlipName(p)).toBe(loop.get(label));
        await expect(notice).toHaveCount(0);
      }
    }

    await joy.page.goto(`/g/${slug}/me`);
    await expect(joy.page.getByText("Tinanggal ka ng organizer sa group na 'to.")).toBeVisible();

    await leakCheck(remaining);
  });

  await test.step("removing someone when only 3 remain is blocked", async () => {
    const { page } = organizer;
    await page.goto(`/g/${slug}/admin`);
    await page.getByRole("button", { name: "Remove Ben", exact: true }).click();
    await page.getByRole("button", { name: "Oo, tanggalin" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("3 na lang kayo");
    await expect(memberList().getByRole("listitem")).toHaveCount(3);
    await shot(page, "remove-blocked-three-left");
  });

  await test.step("no console errors on any page", async () => {
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
