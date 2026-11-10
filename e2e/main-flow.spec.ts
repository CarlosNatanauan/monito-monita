/**
 * Main flow, end to end, on a phone: create → join (x3) → personal link →
 * organizer page → remove member → access checks.
 *
 * Each person has their own browser context (own cookies), like separate
 * phones. Runs against `next dev` and the DEV database; test groups are
 * deleted afterwards.
 */
import { mkdirSync, rmSync } from "node:fs";
import { expect, test, type Browser, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
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

async function join(page: Page, shareUrl: string, name: string) {
  await page.goto(shareUrl);
  await page.getByLabel("Pangalan mo").fill(name);
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
    // The warning clears as soon as the name is edited.
    await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
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
      await expect(page.getByRole("list", { name: "Members" }).getByText(name, { exact: true })).toBeVisible();
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
  await test.step("Ben joins (4 active members: Joy, Joy M, Tita Org, Ben)", async () => {
    await join(ben.page, shareUrl, "Ben");
    await expect(ben.page.getByRole("heading", { name: "Hi, Ben!" })).toBeVisible();
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
    await expect(page.getByText("Ayusin muna ang mga bawal sa itaas.")).toBeVisible();
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
    await checkReminder(
      [
        "reminder!",
        `✨ Unang theme: Something soft, simula ${formatPartyDate(addDays(partyDate, -28))}`,
        "💸 Budget: ₱500",
        "Na-update n'yo na ba ang wishlist n'yo?",
      ],
      [shareUrl],
    );
    // Exclusions and removal are locked now.
    await expect(page.getByRole("button", { name: "Add pair" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(0);
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
      await expect(page.getByText("Ang monito mo ay…")).toBeVisible();
      const slips = page.locator('section[aria-label="Your monito"] p.font-hand');
      await expect(slips).toHaveCount(1);
      const receiverName = (await slips.textContent())!.trim();
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

  await test.step("joining is closed after the draw", async () => {
    const late = await newPerson(browser, testInfo, "Late Larry");
    await late.page.goto(shareUrl);
    await expect(late.page.getByText("Sarado na ang sali.")).toBeVisible();
    await expect(late.page.getByLabel("Pangalan mo")).toHaveCount(0);
    await shot(late.page, "join-closed");
    await late.context.close();
  });

  async function leakCheck() {
    const truth = await getTruth(slug);
    expectOrganizerPageClean(await capturePage(organizer.page, `/g/${slug}/admin`), truth);
    const stranger = await newPerson(browser, testInfo, "Stranger");
    expectJoinPageClean(await capturePage(stranger.page, shareUrl), truth);
    await stranger.context.close();
    for (const { label, person } of everyone) {
      expectMemberPageClean(await capturePage(person.page, `/g/${slug}/me`), truth, label);
    }
  }

  await test.step("leak test: no page exposes anyone else's pair (HTML + network)", async () => {
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

    const after = await getTruth(slug);
    expect(after.pairs).toHaveLength(4);
    expect(after.pairs.some((p) => before.includes(p.id)), "all assignment rows replaced").toBe(false);

    // With 4 people and Joy–Joy M excluded, a redraw may land on the same
    // loop by chance; what matters is it's a fresh, valid draw.
    const secondDraw = await checkResults("joy-sees-monito-after-redraw");
    expect(secondDraw.size).toBe(firstDraw.size);
    await leakCheck();
  });

  await test.step("no console errors on any page", async () => {
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
