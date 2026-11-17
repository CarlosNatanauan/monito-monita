/**
 * Main flow, part 1 of 4, on a phone: the landing bowl, creating a group,
 * share previews, joining (taken name, the slip drop), someone else's
 * link, coming back by link, the organizer page and role switch, removing
 * a member before the draw, access checks, wishlists, the GC reminder and
 * theme weeks before the draw, and "Your groups" on the home page.
 *
 * Starts from nothing and clicks through it all. Runs against `next dev`
 * and the DEV database; the test group is deleted afterwards.
 */
import type { Page } from "@playwright/test";
import { expect, test } from "./test";
import { formatPartyDate } from "../lib/format";
import { addDays, formatShortDate, todayIn } from "../lib/theme-weeks";
import { closeDb } from "../server/db";
import { deleteGroups, E2E_PREFIX } from "./db-cleanup";
import { checkReminder, expectCardOrder, join, people, readLink, screenshotter } from "./flow";
import { readMaskedLink, readMyLink } from "./links";

const createdSlugs: string[] = [];

test.afterAll(async () => {
  await deleteGroups(createdSlugs);
  await closeDb();
});

test("setup and join: create, join, organizer, wishlists, reminder", async ({ browser }, testInfo) => {
  const shot = screenshotter(testInfo, "flow-1-setup-join");
  const { problems, newPerson } = people(browser, testInfo);
  const groupName = `${E2E_PREFIX}Barkada (${testInfo.project.name})`;
  const partyDate = addDays(todayIn("Asia/Manila"), 40);

  const organizer = await newPerson("organizer");
  let shareUrl = "";
  let organizerUrl = "";
  let joyLink = "";
  let joyMLink = "";
  let slug = "";

  await test.step("home → Create your group → /new", async () => {
    const { page } = organizer;
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Isang link lang para sa buong bunutan." })).toBeVisible();
    await shot(page, "home");

    // "Try a bunutan": the first draw is the mockup's sample, then a random other.
    const sample = page.locator("[data-sample-slip]");
    await page.getByRole("button", { name: /^(Tap|Click) the bowl para bumunot$/ }).click();
    await expect(sample).toHaveAttribute("data-sample-slip", "Ate Joy");
    await expect(page.getByRole("button", { name: "Tap ulit para bumunot ng iba" })).toBeVisible({ timeout: 15_000 });
    await expect(sample.locator('[data-part="name-inner"]')).toHaveText(/Ate\s+Joy/);
    await shot(page, "home-sample-slip");
    await page.getByRole("button", { name: "Tap ulit para bumunot ng iba" }).click();
    await expect(sample).not.toHaveAttribute("data-sample-slip", "Ate Joy");
    await expect(page.getByRole("button", { name: "Tap ulit para bumunot ng iba" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("link", { name: "Create your group" }).click();
    await expect(page).toHaveURL(/\/new$/);
    await expect(page.getByRole("heading", { name: "Gumawa ng group" })).toBeVisible();
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
    await page.getByLabel("Pangalan ng group").fill(groupName);
    await expect(page.getByText("Pakilagay ang pangalan ng group.")).toHaveCount(0);
    await expect(page.getByText("Pakilagay ang budget (₱1 pataas).")).toBeVisible();

    // What you typed survives a failed submit (regression: WebKit cleared it).
    await page.getByRole("button", { name: "Create group" }).click();
    await expect(page.getByText("Pakilagay ang pangalan ng group.")).toHaveCount(0);
    await expect(page.getByText("Pakilagay ang budget (₱1 pataas).")).toBeVisible();
    await expect(page.getByLabel("Pangalan ng group")).toHaveValue(groupName);
  });

  await test.step("create a group with edited themes", async () => {
    const { page } = organizer;
    await page.getByLabel("Pangalan ng group").fill(groupName);
    await page.getByLabel("Budget", { exact: true }).fill("500");
    await page.getByLabel("Petsa ng party").fill(partyDate);

    await page.getByRole("textbox", { name: "Theme 2", exact: true }).fill("Something green");
    await page.getByRole("button", { name: "Remove theme 4" }).click();
    await page.getByRole("button", { name: "+ Magdagdag ng week" }).click();
    await page.getByRole("textbox", { name: "Theme 4", exact: true }).fill("Something handmade");
    await expect(page.getByLabel(/^Theme \d$/)).toHaveCount(4);
    await expect(page.getByText(/^Starts [A-Z][a-z]{2} \d{1,2}$/)).toHaveCount(4);
    await shot(page, "new-filled");

    await page.getByRole("button", { name: "Create group" }).click();
    await expect(page.getByRole("heading", { name: "Ready na ang group mo!" })).toBeVisible();
    await expect(page.getByText("Organizer link mo")).toBeVisible();

    shareUrl = await readLink(page, /\/g\/[a-z0-9]+$/);
    // The organizer link is masked on screen (screenshots); Copy has the real one.
    organizerUrl = await readMaskedLink(page, { copyLabel: "Copy organizer link", pageName: "admin" });
    slug = new URL(shareUrl).pathname.split("/")[2];
    createdSlugs.push(slug);
    expect(organizerUrl).toContain(`/g/${slug}/admin?t=`);
    await shot(page, "group-created");
  });

  await test.step("share previews: the join link names the group and date; personal pages stay generic", async () => {
    const { page } = organizer;
    const asPreviewBot = { headers: { "user-agent": "facebookexternalhit/1.1" } };
    const meta = (html: string, property: string) =>
      new RegExp(`<meta property="${property}" content="([^"]*)"`).exec(html)?.[1] ?? null;
    const decode = (s: string | null) => s?.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'") ?? null;

    const join = await (await page.request.get(shareUrl, asPreviewBot)).text();
    expect(decode(meta(join, "og:title"))).toBe(`Sali na sa bunutan ng ${groupName}`);
    expect(meta(join, "og:description")).toContain(formatPartyDate(partyDate));
    const image = meta(join, "og:image")!;
    expect(new URL(image).pathname).toBe(`/g/${slug}/og`);
    const png = await page.request.get(new URL(image).pathname);
    expect(png.status()).toBe(200);
    expect(png.headers()["content-type"]).toBe("image/png");

    // The organizer link (token stripped by the proxy) and /me: the generic preview only.
    for (const path of [`/g/${slug}/admin`, `/g/${slug}/me`]) {
      const html = await (await page.request.get(path, asPreviewBot)).text();
      expect(meta(html, "og:title"), path).toBe("Monito Monita — Bunutan, wishlists, and the big reveal.");
      expect(html, path).not.toContain(`/g/${slug}/og`);
    }
  });

  const joy = await newPerson("Joy");
  await test.step("Joy joins via the share link and lands on /me", async () => {
    const { page } = joy;
    await page.goto(shareUrl);
    await expect(page.getByRole("heading", { name: groupName })).toBeVisible();
    // Nobody yet: the green tag says so.
    await expect(page.getByText("Wala pa", { exact: true })).toBeVisible();
    await shot(page, "join-page");

    await page.getByLabel("Pangalan mo").fill("Joy");
    // The PIN is required, on a numeric keypad.
    await page.getByRole("button", { name: "Join the group" }).click();
    await expect(page.locator("main").getByRole("alert")).toHaveText("Pakilagay ang 4-digit PIN.");
    await expect(page.getByLabel("4-digit PIN")).toHaveAttribute("inputmode", "numeric");
    await page.getByLabel("4-digit PIN").fill("1234");
    await page.getByRole("button", { name: "Join the group" }).click();
    // Signature moment 2: her slip folds and drops into the bowl, then /me.
    const drop = page.locator("[data-join-drop]");
    await expect(drop).toBeVisible();
    await expect(drop.locator('[data-part="name-inner"]')).toHaveText(/Joy/);
    await shot(page, "joy-join-drop");
    await expect(page.getByRole("heading", { name: "Hi, Joy!" })).toBeVisible();
    // The join page may stay alive but hidden after the navigation (Activity).
    await expect(drop).toBeHidden();
    await expect(page.getByText("I-save ang link mo!")).toBeVisible();
    // The welcome highlight stays, but ?welcome=1 is replaced away (no reload).
    await expect(page).toHaveURL(new RegExp(`/g/${slug}/me$`));
    await expect(page.getByText("I-save ang link mo!")).toBeVisible();
    // Member only: no role switch.
    await expect(page.getByRole("navigation", { name: "Switch view" })).toHaveCount(0);
    await expect(page.getByText("Hintayin ang bunutan")).toBeVisible();
    joyLink = await readMyLink(page);
    await shot(page, "joy-me-welcome");
  });

  const joyM = await newPerson("Joy M");
  await test.step("'joy' is taken: two choices, 'Hindi ako 'yan' → joins as 'Joy M'", async () => {
    const { page } = joyM;
    await join(page, shareUrl, "joy", "5678");
    // Nothing created; the name they typed is taken, so: is it them?
    await expect(page.getByRole("heading", { name: "May joy na sa group" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ako 'yan, ilalagay ko ang PIN" })).toBeInViewport({ ratio: 1 });
    const notMe = page.getByRole("button", { name: "Hindi ako 'yan, gagamit ako ng ibang pangalan" });
    await expect(notMe).toBeInViewport({ ratio: 1 });
    // Nobody else's name: only the one typed.
    await expect(page.getByText(/\bJoy\b/)).toHaveCount(0);
    await shot(page, "name-taken-choice");

    await notMe.click();
    await expect(page.getByLabel("Pangalan mo")).toHaveValue("joy");
    await expect(page.getByText("May joy na. Lagyan ng initial, hal. “joy R.”")).toBeVisible();
    await page.getByLabel("Pangalan mo").fill("Joy M");
    await page.getByLabel("4-digit PIN").fill("5678");
    await page.getByRole("button", { name: "Join the group" }).click();
    // A tap skips the drop.
    await page.locator("[data-join-drop]").click();
    await expect(page.getByRole("heading", { name: "Hi, Joy M!" })).toBeVisible();
    joyMLink = await readMyLink(page);
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

  let marco = await newPerson("Marco");
  let marcoLink = "";
  await test.step("Marco joins, closes the browser, comes back with his link", async () => {
    await join(marco.page, shareUrl, "Marco");
    await expect(marco.page.getByRole("heading", { name: "Hi, Marco!" })).toBeVisible();
    marcoLink = await readMyLink(marco.page);
    await marco.context.close();

    marco = await newPerson("Marco (new phone)");
    await marco.page.goto(marcoLink);
    // The token is swapped for a cookie and removed from the URL.
    await expect(marco.page).toHaveURL(new RegExp(`/g/${slug}/me$`));
    await expect(marco.page.getByRole("heading", { name: "Hi, Marco!" })).toBeVisible();
    await expect(marco.page.getByText("Personal link mo")).toBeVisible();
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
    // Each row says "Sumali na"; opening a row shows when they joined.
    await expect(page.getByRole("list", { name: "Members" }).getByText("Sumali na")).toHaveCount(3);
    await page.getByRole("button", { name: "Manage Joy", exact: true }).click();
    await expect(page.getByText(/^Joined [A-Z][a-z]{2} \d{1,2}, \d{1,2}:\d{2} [AP]M$/)).toHaveCount(1);
    await page.getByRole("button", { name: "Manage Joy", exact: true }).click();
    await expect(page.getByText("Kasali ka rin ba?")).toBeVisible();
    await shot(page, "admin-with-hint");

    await page.getByRole("link", { name: "Join as a member" }).click();
    await expect(page).toHaveURL(new RegExp(`/g/${slug}$`));
    await page.getByLabel("Pangalan mo").fill("Tita Org");
    await page.getByLabel("4-digit PIN").fill("2580");
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
    await page.getByRole("button", { name: "Manage Marco" }).click();
    await page.getByRole("button", { name: "Remove Marco" }).click();
    await expect(page.getByText("Tanggalin si Marco sa group?")).toBeVisible();
    await shot(page, "remove-confirm");
    await page.getByRole("button", { name: "Oo, tanggalin" }).click();
    await expect(page.getByRole("list", { name: "Members" }).getByText("Marco", { exact: true })).toHaveCount(0);
    await expect(page.getByText("3 na ang sumali").first()).toBeVisible();
    await shot(page, "admin-after-remove");

    // On Marco's phone: told he was removed, with no way to rejoin from there…
    await marco.page.reload();
    await expect(marco.page.getByText("Wala ka na sa group na 'to")).toBeVisible();
    await expect(marco.page.getByText("Kung mali, i-message ang organizer.", { exact: false })).toBeVisible();
    await expect(marco.page.getByRole("link", { name: "Join the group" })).toHaveCount(0);
    await shot(marco.page, "marco-removed-notice");
    await marco.page.goto(shareUrl);
    await expect(marco.page.getByText("Wala ka na sa group na 'to")).toBeVisible();
    await expect(marco.page.getByLabel("Pangalan mo")).toHaveCount(0);
    // …and neither does his personal link on yet another phone: it says he was removed.
    const marco3 = await newPerson("Marco (third phone)");
    await marco3.page.goto(marcoLink);
    await expect(marco3.page).toHaveURL(new RegExp(`/g/${slug}/me[?]link=removed$`));
    await expect(marco3.page.getByText("Wala ka na sa group na 'to")).toBeVisible();
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
    await expect(page.getByRole("heading", { name: "Naligaw ang slip na 'to" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Bumalik sa home" })).toHaveAttribute("href", "/");
    await shot(page, "unknown-group");
  });

  const ben = await newPerson("Ben");
  await test.step("Ben joins (4 active members: Joy, Joy M, Tita Org, Ben)", async () => {
    await join(ben.page, shareUrl, "Ben");
    await expect(ben.page.getByRole("heading", { name: "Hi, Ben!" })).toBeVisible();
  });

  // Wishlists. Titles are unique and contain no member names (leak checks).
  async function addWish(page: Page, title: string, url = "", note = "") {
    await page.getByLabel("Ano ang gusto mo?").fill(title);
    if (url || note) await page.getByRole("button", { name: "Lagyan ng link o note" }).click();
    if (url) await page.getByLabel("Link (optional)").fill(url);
    if (note) await page.getByLabel("Note (optional)").fill(note);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("list", { name: "Wishlist mo" }).getByText(title, { exact: true })).toBeVisible();
    // Shown at once (optimistic); saved when its Edit button replaces "Sine-save…".
    await expect(page.getByRole("button", { name: `Edit ${title}` })).toBeVisible();
  }

  await test.step("wishlists: empty state, add, edit (before the draw)", async () => {
    await organizer.page.goto(`/g/${slug}/me`);
    await expect(
      organizer.page.getByText("Wala pang laman ang wishlist mo."),
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
    await page.getByRole("list", { name: "Wishlist mo" }).getByLabel("Ano ang gusto mo?").fill("Mug na cute (blue)");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(myList.getByText("Mug na cute (blue)", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit Mug na cute (blue)" })).toBeVisible();
    await addWish(page, "Plant (small lang)");
    await shot(page, "joy-wishlist");

    // A bad link is rejected with a clear message.
    await page.getByLabel("Ano ang gusto mo?").fill("Sketchy");
    await page.getByRole("button", { name: "Lagyan ng link o note" }).click();
    await page.getByLabel("Link (optional)").fill("javascript:alert(1)");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText("Hindi valid ang link. Dapat http o https.")).toBeVisible();
    // Rolled back, with what was typed back in the field to fix.
    await expect(page.getByRole("list", { name: "Wishlist mo" }).getByText("Sketchy")).toHaveCount(0);
    await expect(page.getByLabel("Ano ang gusto mo?")).toHaveValue("Sketchy");
    await expect(page.getByText("Hindi na-save ang “Sketchy”.", { exact: false })).toBeVisible();
    // Leave the half-filled form behind.
    await page.reload();

    await joyM.page.goto(`/g/${slug}/me`);
    await addWish(joyM.page, "Notebook");
    await ben.page.goto(`/g/${slug}/me`);
    await addWish(ben.page, "Socks");
  });

  await test.step("a wish typed before /me hydrates (slow phone) is still added", async () => {
    // Chromium only: holding the scripts with page.route is reliable there.
    if (browser.browserType().name() !== "chromium") return;
    const { page } = ben;
    let release!: () => void;
    const scriptsHeld = new Promise<void>((resolve) => (release = resolve));
    const hold = async (route: import("@playwright/test").Route) => {
      await scriptsHeld;
      await route.continue();
    };
    await page.route("**/_next/static/chunks/**/*.js", hold);
    await page.goto(`/g/${slug}/me`, { waitUntil: "commit" });
    // The server HTML is up, React isn't: type now.
    await page.getByLabel("Ano ang gusto mo?").fill("Scarf");
    release();
    await page.waitForLoadState("load");
    await page.unroute("**/_next/static/chunks/**/*.js", hold);
    await expect(page.getByRole("button", { name: "Add", exact: true })).toBeEnabled();
    // Hydration done when a client-only control responds.
    await expect(async () => {
      await page.getByRole("button", { name: "Lagyan ng link o note" }).click({ timeout: 2_000 });
      await expect(page.getByLabel("Link (optional)")).toBeVisible({ timeout: 1_000 });
    }).toPass();
    await expect(page.getByLabel("Ano ang gusto mo?")).toHaveValue("Scarf");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("list", { name: "Wishlist mo" }).getByText("Scarf", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit Scarf" })).toBeVisible();
    await expect(page.getByText("Pakilagay kung ano ang gusto mo.")).toHaveCount(0);
  });

  await test.step("GC reminder before the draw: invite, link, count, party date", async () => {
    await organizer.page.goto(`/g/${slug}/admin`);
    // Before the draw: share link and Draw near the top, the rest below.
    await expectCardOrder(organizer.page, [
      /^\d+ na ang sumali$/,
      "Bawal magkabunot",
      "Bunutan",
      "Members",
      "Paalala para sa GC",
    ]);
    await expect(organizer.page.getByRole("group", { name: "Reminder type" })).toHaveCount(0);
    await checkReminder(browser, organizer.page, [
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
    await expect(card.getByText("Unang theme", { exact: true })).toBeVisible();
    await expect(card.getByText("Something soft", { exact: true })).toBeVisible();
    await expect(card.getByText(`Simula sa 12 araw, ${formatShortDate(firstStart)} · hanggang ₱500`)).toBeVisible();
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
    const joyRow = yours.getByRole("listitem").filter({ hasText: `Continue: ${groupName}` });
    await expect(joyRow).toContainText("member");
    await expect(joyRow).not.toContainText("organizer");
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
    const orgYours = organizer.page.getByRole("region", { name: "Your groups" });
    const orgLink = orgYours.getByRole("link", { name: `Continue: ${groupName}` });
    await expect(orgYours.getByRole("listitem").filter({ hasText: `Continue: ${groupName}` })).toContainText("organizer, member");
    await orgLink.click();
    await expect(organizer.page).toHaveURL(new RegExp(`/g/${slug}/admin$`));
  });

  await test.step("no console errors on any page", async () => {
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
