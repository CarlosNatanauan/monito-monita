/**
 * Slow phones (persona test B1): tapping "Join the group" or "Buksan ang
 * slip ko" before the page hydrates must still work. The forms post as
 * plain HTML forms then, and Next's Server Actions CSRF check needs a real
 * Origin header, which Chrome only sends when the Referrer-Policy isn't
 * "no-referrer". Also checks that personal-link tokens still never leave
 * the site with "same-origin".
 *
 * The early taps run on Chromium (the phone is throttled over CDP and the
 * page's scripts are held until after the tap). The header and token
 * checks run on every phone.
 */
import type { Page, Request, Route } from "@playwright/test";
import { and, eq, isNull } from "drizzle-orm";
import { expect, test } from "./test";
import { closeDb, db } from "../server/db";
import { members } from "../server/db/schema";
import { deleteGroups, E2E_PREFIX } from "./db-cleanup";
import { holdActions, people, readLink } from "./flow";
import { addDays, todayIn } from "../lib/theme-weeks";
import { seedGroup } from "./seed";

const createdSlugs: string[] = [];

test.afterAll(async () => {
  await deleteGroups(createdSlugs);
  await closeDb();
});

const SCRIPTS = "**/_next/static/chunks/**/*.js";
const OTHER_SITE = "https://referrer-check.example";

/**
 * Throttles the phone like Kuya Ben's (400 ms, 1.6 Mbps) and holds every
 * script until `release()`, so the page shows its server HTML but React
 * hasn't run: exactly when he tapped.
 */
async function slowPhone(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 400,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  const hold = async (route: Route) => {
    await held;
    await route.continue().catch(() => {});
  };
  await page.route(SCRIPTS, hold);
  return {
    release: async () => {
      release();
      await page.unroute(SCRIPTS, hold);
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1,
      });
    },
  };
}

/** The form post a pre-hydration tap sends (a document POST, not a fetch). */
const isFormPost = (request: Request) => request.method() === "POST" && request.resourceType() === "document";

test("slow phone: Join and come-back before hydration; tokens stay on the site", async ({ browser }, testInfo) => {
  const { problems, newPerson } = people(browser, testInfo);
  const group = await seedGroup({ name: `Slow phone (${testInfo.project.name})`, people: ["Carla", "Nena"] }, createdSlugs);
  const chromium = browser.browserType().name() === "chromium";

  await test.step("Join tapped before the page loads: joins, no blank page", async () => {
    if (!chromium) return; // Throttling and holding scripts: Chromium only.
    const ben = await newPerson("Ben (slow)");
    const { page } = ben;
    const phone = await slowPhone(page);
    await page.goto(group.sharePath, { waitUntil: "commit" });
    // The server HTML is up; React isn't.
    await page.getByLabel("Pangalan mo").fill("Kuya Ben");
    await page.getByLabel("4-digit PIN").fill("4321");
    const post = page.waitForRequest(isFormPost);
    await page.getByRole("button", { name: "Join the group" }).click();
    const response = await (await post).response();
    expect(response?.status(), "the early Join post is accepted").toBeLessThan(400);
    await phone.release();
    // The slip drop plays, then /me.
    await expect(page).toHaveURL(new RegExp(`/g/${group.slug}/me`), { timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /Hi, Kuya Ben!/ })).toBeVisible();
    const saved = await db()
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.groupId, group.groupId), eq(members.displayName, "Kuya Ben"), isNull(members.removedAt)));
    expect(saved).toHaveLength(1);
  });

  await test.step("'Buksan ang slip ko' tapped before the page loads: opens the slip page", async () => {
    if (!chromium) return; // Throttling and holding scripts: Chromium only.
    const nena = await newPerson("Nena (new phone, slow)");
    const { page } = nena;
    const phone = await slowPhone(page);
    await page.goto(`${group.sharePath}?bumalik=1`, { waitUntil: "commit" });
    const form = page.getByRole("form", { name: "Bumalik" });
    await form.getByLabel("Pangalan mo").fill("Nena");
    await form.getByLabel("4-digit PIN").fill("1234");
    const post = page.waitForRequest(isFormPost);
    await form.getByRole("button", { name: "Buksan ang slip ko" }).click();
    const response = await (await post).response();
    expect(response?.status(), "the early come-back post is accepted").toBeLessThan(400);
    await phone.release();
    await expect(page).toHaveURL(new RegExp(`/g/${group.slug}/me$`));
    await expect(page.getByRole("heading", { name: /Hi, Nena!/ })).toBeVisible();
  });

  await test.step("Referrer-Policy is same-origin on every page that can carry a link", async () => {
    const check = await newPerson("headers");
    const { request } = check.context;
    const token = new URL(group.members.Carla.link, "http://x").searchParams.get("t")!;
    for (const path of [group.sharePath, `${group.sharePath}?bumalik=1`, `/g/${group.slug}/me`, `/g/${group.slug}/admin`, `/g/${group.slug}/reveal`, "/new"]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.headers()["referrer-policy"], path).toBe("same-origin");
    }
    // The personal link's redirect (it has the token in its URL).
    const redirect = await request.get(group.members.Carla.link, { maxRedirects: 0 });
    expect(redirect.status()).toBe(303);
    expect(redirect.headers()["referrer-policy"]).toBe("same-origin");
    expect(redirect.headers().location ?? "").not.toContain(token);
  });

  await test.step("opening a personal link: the token is never sent to another site, or in any Referer", async () => {
    const carla = await newPerson("Carla");
    const { page } = carla;
    const token = new URL(group.members.Carla.link, "http://x").searchParams.get("t")!;
    const seen: { url: string; referer: string | undefined }[] = [];
    page.on("request", (req) => {
      void req.allHeaders().then((h) => seen.push({ url: req.url(), referer: h.referer }));
    });
    const outside: { url: string; referer: string | undefined }[] = [];
    await page.route(`${OTHER_SITE}/**`, async (route) => {
      const headers = await route.request().allHeaders();
      outside.push({ url: route.request().url(), referer: headers.referer });
      await route.fulfill({ status: 200, contentType: "text/html", body: "<p>ok</p>" });
    });

    await page.goto(group.members.Carla.link);
    await expect(page).toHaveURL(new RegExp(`/g/${group.slug}/me$`));
    await page.waitForLoadState("networkidle");
    const own = new URL(page.url()).origin;
    // A request to another site from /me (an image), then leaving for it.
    await page.evaluate((site) => {
      const img = new Image();
      img.src = `${site}/pixel.png`;
      document.body.append(img);
    }, OTHER_SITE);
    await expect.poll(() => outside.length).toBeGreaterThan(0);
    await page.evaluate((site) => void window.open(`${site}/page`, "_self"), OTHER_SITE);
    await expect.poll(() => outside.length).toBeGreaterThan(1);

    expect(outside.map((o) => o.referer), "no Referer to another site").toEqual(outside.map(() => undefined));
    for (const s of seen) {
      expect(s.referer ?? "", `Referer of ${s.url}`).not.toContain(token);
      if (!s.url.startsWith(own) && s.url.startsWith("http")) {
        expect(s.url, "a request to another site carries the token").not.toContain(token);
      }
    }
  });

  expect(problems.filter((p) => !p.includes(OTHER_SITE))).toEqual([]);
});

test("slow phone: /new keeps everything typed before it hydrates", async ({ page }, testInfo) => {
  test.skip(page.context().browser()?.browserType().name() !== "chromium", "CPU throttling and held scripts: Chromium only");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  const phone = await slowPhone(page);
  const name = `${E2E_PREFIX}Mabagal (${testInfo.project.name})`;
  const partyDate = addDays(todayIn("Asia/Manila"), 35);

  // Typed straight away, into the server's HTML: React hasn't run yet.
  await page.goto("/new", { waitUntil: "commit" });
  await page.getByLabel("Pangalan ng group").fill(name);
  await page.getByLabel("Petsa ng party").fill(partyDate);
  await page.getByLabel("Budget", { exact: true }).fill("750");
  await page.getByRole("textbox", { name: "Theme 2" }).fill("Something blue");
  await phone.release();

  // Hydrated: "Create group" is enabled only once React runs. Nothing typed was lost,
  // also after the next keystroke (a re-render of the controlled fields).
  await expect(page.getByRole("button", { name: "Create group" })).toBeEnabled({ timeout: 60_000 });
  await page.getByLabel("Pangalan ng group").press("End");
  await page.getByLabel("Pangalan ng group").pressSequentially("!");
  await expect(page.getByLabel("Pangalan ng group")).toHaveValue(`${name}!`);
  await expect(page.getByLabel("Petsa ng party")).toHaveValue(partyDate);
  await expect(page.getByLabel("Budget", { exact: true })).toHaveValue("750");
  await expect(page.getByRole("textbox", { name: "Theme 2" })).toHaveValue("Something blue");
  // The live GC preview follows the same state.
  await expect(page.getByText(/₱750/).first()).toBeVisible();

  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page.getByRole("heading", { name: "Ready na ang group mo!" })).toBeVisible({ timeout: 30_000 });
  const shareUrl = await readLink(page, /\/g\/[a-z0-9]+$/);
  createdSlugs.push(new URL(shareUrl).pathname.split("/")[2]);
});

/**
 * A slow response to a submit (the flow-1 flake, taken as a real risk): while
 * it's pending the form's fields are read-only (they still post), so nothing
 * typed then can be lost; and what's typed the moment the response lands
 * stays after the error renders (no form reset, no older values put back).
 */
test("pending submit: fields read-only, and the error never overwrites what's typed after", async ({ page }, testInfo) => {
  const group = await seedGroup({ name: `Pending (${testInfo.project.name})`, people: ["Carla"] }, createdSlugs);
  const settled = () => page.waitForTimeout(1500); // any late re-render or reset would have happened by now

  await test.step("/new: submit without a budget, type while it's pending, then right after", async () => {
    await page.goto("/new");
    const create = page.getByRole("button", { name: "Create group" });
    await expect(create).toBeEnabled({ timeout: 30_000 });
    const name = page.getByLabel("Pangalan ng group");
    const date = page.getByLabel("Petsa ng party");
    const budget = page.getByLabel("Budget", { exact: true });
    await name.fill(`${E2E_PREFIX}Pending`);
    await date.fill(addDays(todayIn("Asia/Manila"), 30));

    const hold = await holdActions(page);
    await create.click();
    await expect.poll(() => hold.held()).toBe(1);
    for (const field of [name, date, budget, page.getByRole("textbox", { name: "Theme 1" })]) {
      await expect(field).toHaveAttribute("readonly", "");
    }
    await expect(page.getByRole("button", { name: "Remove theme 1" })).toBeDisabled();
    // Typing while it's pending changes nothing.
    await budget.focus();
    await page.keyboard.type("999");
    await expect(budget).toHaveValue("");

    await hold.release();
    // Typed as soon as the field takes input again (the response has landed): it stays.
    await budget.fill("750");
    await name.fill(`${E2E_PREFIX}Pending 2`);
    await settled();
    await expect(budget).toHaveValue("750");
    await expect(name).toHaveValue(`${E2E_PREFIX}Pending 2`);
    await expect(page.getByText(/₱750/).first()).toBeVisible();
    await expect(budget).not.toHaveAttribute("readonly", "");
  });

  await test.step("join: submit without a PIN, then change the name the moment it comes back", async () => {
    await page.goto(group.sharePath);
    const join = page.getByRole("button", { name: "Join the group" });
    await expect(join).toBeEnabled();
    const name = page.getByLabel("Pangalan mo");
    await name.fill("Kuya Ben");

    const hold = await holdActions(page);
    await join.click();
    await expect.poll(() => hold.held()).toBe(1);
    await expect(name).toHaveAttribute("readonly", "");
    await expect(page.getByLabel("4-digit PIN")).toHaveAttribute("readonly", "");

    await hold.release();
    // Before: React's form reset after the action put the submitted name back over this.
    await name.fill("Kuya Ben R.");
    await settled();
    await expect(name).toHaveValue("Kuya Ben R.");
    await expect(page.getByLabel("4-digit PIN")).not.toHaveAttribute("readonly", "");
  });
});
