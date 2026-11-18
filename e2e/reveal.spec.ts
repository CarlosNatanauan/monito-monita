/**
 * The animated party reveal (signature moment 4) on a projector laptop at
 * 1920×1080, plus 1366×768 and 1280×720: a group of 12 (the mockup's ring)
 * and a group of 30 (the moving window), the organizer's phone as remote,
 * the finale, reduced motion, lazy loading, and the leak test at each
 * stage. Groups are seeded straight into the DEV database and deleted
 * afterwards.
 */
import { devices, type Browser, type BrowserContext, type Page, type Response } from "@playwright/test";
import { expect, test } from "./test";
import { eq } from "drizzle-orm";
import { addDays, todayIn } from "../lib/theme-weeks";
import { closeDb, db } from "../server/db";
import { groups } from "../server/db/schema";
import { drawNames } from "../server/draw-service";
import { createGroup } from "../server/groups";
import { joinGroup } from "../server/members";
import { deleteGroups, E2E_PREFIX } from "./db-cleanup";
import { capturePage, expectRevealPageClean, getTruth, revealOrderOf, ringIndices } from "./leak";

const createdSlugs: string[] = [];
test.afterAll(async () => {
  await deleteGroups(createdSlugs);
  await closeDb();
});

// The mockup's ring, and a big office group (names that never occur in page code).
const TWELVE = ["Joy", "Marco", "Carlo", "Bea", "Paolo", "Tita Luz", "Jun", "Aira", "Lito", "Mila", "Rico", "Nena"];
const THIRTY = [
  "Andoy", "Bebeng", "Celso", "Dindo", "Egay", "Florante", "Gloria", "Hermie", "Isko", "Jolina",
  "Kardo", "Lorna", "Mylene", "Nestor", "Osang", "Precy", "Quintin", "Rosing", "Sabel", "Tonyo",
  "Ursula", "Vilma", "Waldo", "Xandra", "Yoyong", "Zenaida", "Amparo", "Berting", "Conching", "Dolor",
];

interface Seeded {
  slug: string;
  organizerUrl: string;
  revealUrl: string;
}

async function seedGroup(name: string, people: string[]): Promise<Seeded> {
  const created = await createGroup({
    name: `${E2E_PREFIX}${name}`,
    budget: 500,
    partyDate: addDays(todayIn("Asia/Manila"), 30),
    themes: [],
  });
  createdSlugs.push(created.slug);
  for (const person of people) {
    const joined = await joinGroup(created.slug, person, "1234");
    if (!joined.ok) throw new Error(joined.message);
  }
  const drawn = await drawNames(created.groupId, "draw");
  if (!drawn.ok) throw new Error(drawn.message);
  return {
    slug: created.slug,
    organizerUrl: `/g/${created.slug}/admin?t=${created.organizerToken}`,
    revealUrl: `/g/${created.slug}/reveal`,
  };
}

/** Moves a running reveal straight to `step` (as if the organizer had tapped through). */
async function setStep(slug: string, step: number) {
  await db().update(groups).set({ revealStep: step }).where(eq(groups.slug, slug));
}

const problems: string[] = [];
function watch(page: Page, label: string) {
  page.on("console", (msg) => {
    if (msg.type() === "error") problems.push(`[${label}] console.error on ${page.url()}: ${msg.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`[${label}] uncaught error on ${page.url()}: ${error.message}`));
}

async function projector(browser: Browser, label: string, options: { reducedMotion?: "reduce" } = {}) {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: "en-PH",
    timezoneId: "Asia/Manila",
    ...options,
  });
  const page = await context.newPage();
  watch(page, label);
  return { context, page };
}

/** JS files a page downloads, and which library each one carries. */
function watchJs(page: Page) {
  const files: { url: string; gsap: boolean; confetti: boolean }[] = [];
  const pending: Promise<void>[] = [];
  page.on("response", (r: Response) => {
    if (!/\.js(\?|$)/.test(r.url())) return;
    pending.push(
      r
        .text()
        .catch(() => "")
        .then((body) => {
          files.push({ url: r.url(), gsap: body.includes("GreenSock"), confetti: body.includes("disableForReducedMotion") });
        }),
    );
  });
  return {
    settled: async () => {
      await Promise.all(pending);
      return files;
    },
  };
}

let shotNumber = 0;
async function shot(page: Page, name: string) {
  shotNumber += 1;
  await page.screenshot({ path: `e2e/screenshots/projector-1080p/${String(shotNumber).padStart(2, "0")}-${name}.png` });
}

const stage = (page: Page) => page.locator(".rv-stage");
const centre = (page: Page) => page.getByRole("region", { name: "Reveal" });
const count = (page: Page, text: string) => page.getByText(text, { exact: true }).filter({ visible: true });
const idle = (page: Page) => expect(stage(page)).not.toHaveAttribute("data-animating", /.*/, { timeout: 10_000 });

/**
 * Projector rules (docs/DESIGN.md): every visible text is 24px or more at
 * 1080p (stage text by its own size, window-sized controls scaled back to
 * 1080p), and nothing important sits in the outer 5% of the frame.
 */
async function expectProjectorLayout(page: Page, label: string) {
  await page.waitForTimeout(300);
  const found = await page.evaluate(() => {
    const out: string[] = [];
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const stageEl = document.querySelector<HTMLElement>(".rv-stage")!;
    const scale = Number(stageEl.style.getPropertyValue("--stage-scale"));
    if (!(scale > 0)) out.push("the stage was never scaled");
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      for (let e: Element | null = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.05) return false;
      }
      return true;
    };
    const ownText = (el: Element) => [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim());
    for (const el of document.querySelectorAll("body *")) {
      if (!ownText(el) || !visible(el)) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      const at1080 = stageEl.contains(el) ? size : size / scale;
      if (at1080 < 23.5) out.push(`text "${el.textContent!.trim().slice(0, 40)}" is ${at1080.toFixed(1)}px at 1080p`);
    }
    const important = document.querySelectorAll(
      '[data-slip], [data-part="centre"] > *, header a, header button, footer p, footer button, .rv-list, .rv-list h2',
    );
    for (const el of important) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.left < vw * 0.05 - 1 || r.top < vh * 0.05 - 1 || r.right > vw * 0.95 + 1 || r.bottom > vh * 0.95 + 1) {
        out.push(
          `${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 30)}" reaches the outer 5% ` +
            `(${Math.round(r.left)},${Math.round(r.top)} → ${Math.round(r.right)},${Math.round(r.bottom)} of ${vw}×${vh})`,
        );
      }
    }
    // The group name and count (bottom left) stay clear of the ring's slips (persona test M1).
    const footer = document.querySelector("footer:has([data-count])");
    if (footer && visible(footer)) {
      const f = footer.getBoundingClientRect();
      for (const slip of document.querySelectorAll("[data-slip]")) {
        if (!visible(slip)) continue;
        const r = slip.getBoundingClientRect();
        if (f.left < r.right && r.left < f.right && f.top < r.bottom && r.top < f.bottom) {
          out.push(`the footer "${(footer.textContent ?? "").trim().slice(0, 40)}" overlaps a slip at ${Math.round(r.left)},${Math.round(r.top)}`);
        }
      }
    }
    return out;
  });
  expect(found, `${label}:\n${found.join("\n")}`).toEqual([]);
}

/** The three common projector sizes; ends back at 1920×1080. */
async function atProjectorSizes(page: Page, label: string, name: string) {
  for (const [w, h] of [
    [1366, 768],
    [1280, 720],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await expectProjectorLayout(page, `${label} at ${w}×${h}`);
    if (w !== 1920) await shot(page, `${name}-${w}x${h}`);
  }
}

/** Faces, haloes and bulb states on the ring: what a refresh must reproduce. */
const ringState = (page: Page) =>
  stage(page).evaluate((el) =>
    [...el.querySelectorAll<HTMLElement>("[data-slip], [data-bulb]")]
      .map((n) => `${n.dataset.slip ?? `b${n.dataset.seg}`}:${n.dataset.face ?? ""}${n.dataset.halo ?? ""}${n.dataset.state ?? ""}@${n.dataset.pos}`)
      .join(" "),
  );

async function openAsOrganizer(page: Page, group: Seeded) {
  await page.goto(group.organizerUrl);
  await expect(page).toHaveURL(new RegExp(`/g/${group.slug}/admin$`));
  await page.goto(group.revealUrl);
}

async function next(page: Page) {
  await page.getByRole("button", { name: "Next", exact: true }).click();
}

test("party reveal on a projector: ring, steps, phone as remote, a group of 30, the finale, leaks", async ({ browser }) => {
  test.setTimeout(600_000);
  const [small, big] = await Promise.all([seedGroup("Barkada Christmas 2026", TWELVE), seedGroup("Office Party", THIRTY)]);
  const laptop = await projector(browser, "laptop");
  const { page } = laptop;
  let phone: { context: BrowserContext; page: Page } | undefined;

  await test.step("start screen: a blank ring, no names or codenames; GSAP comes after the page, confetti not at all", async () => {
    const js = watchJs(page);
    await openAsOrganizer(page, small);
    await expect(page.getByRole("heading", { name: "Handa na?" })).toBeVisible();
    await expect(page.getByText("12 slips, 12 sikreto. Pindutin para simulan.")).toBeVisible();
    await expect(page.locator('[data-slip][data-face="blank"]')).toHaveCount(12);
    await expect(page.locator('[data-bulb][data-state="off"]')).toHaveCount(48);
    await page.waitForLoadState("networkidle");
    const files = await js.settled();
    expect(files.some((f) => f.gsap), "GSAP is fetched for the reveal timelines").toBe(true);
    expect(files.some((f) => f.confetti), "confetti waits for the last pair").toBe(false);
    const truth = await getTruth(small.slug);
    expectRevealPageClean(await capturePage(page, small.revealUrl), truth, revealOrderOf(truth, "Joy"), 0);
    await expectProjectorLayout(page, "start screen");
    await shot(page, "start");
  });

  const smallOrder = revealOrderOf(await getTruth(small.slug), "Joy");

  /** The screen shows pair `step` of the 12: centre, its slip with the halo, and every earlier slip revealed. */
  async function expectSmallStep(p: Page, step: number) {
    const pair = smallOrder[step - 1];
    await expect(count(p, `${step} of 12`)).toBeVisible();
    await expect(centre(p)).toContainText(`Si ${pair.codename} ay si…`);
    await expect(centre(p)).toContainText(`${pair.giver}!`);
    await expect(centre(p)).toContainText(`Ang monito niya: ${pair.receiver}`);
    const current = p.locator('[data-slip][aria-current="step"]');
    await expect(current).toHaveAttribute("data-slip", String(step - 1));
    await expect(current).toHaveAttribute("data-halo", "true");
    await expect(p.locator('[data-slip][data-face="revealed"]')).toHaveCount(step);
    await expect(p.locator('[data-bulb][data-state="glow"]')).toHaveCount(4);
    await expect(p.locator(`[data-bulb][data-seg="${step - 1}"][data-state="glow"]`)).toHaveCount(4);
    await expect(p.locator('[data-bulb][data-state="on"]')).toHaveCount(4 * (step - 1));
  }

  await test.step("Start, then Space and → for Next, ← for Previous, each one animated", async () => {
    await page.getByRole("button", { name: "Simulan ang reveal" }).click();
    await page.getByRole("button", { name: "Oo, simulan na" }).click();
    await expectSmallStep(page, 1);
    await expect(stage(page)).toHaveAttribute("data-last-transition", "start");
    await idle(page);
    // Focus on the page itself, not a button (Space on a button presses that button).
    await page.locator("body").click({ position: { x: 960, y: 540 } });
    await page.keyboard.press(" ");
    await expectSmallStep(page, 2);
    await expect(stage(page)).toHaveAttribute("data-last-transition", "next");
    await idle(page);
    await page.keyboard.press("ArrowRight");
    await expectSmallStep(page, 3);
    await idle(page);
    await page.keyboard.press("ArrowLeft");
    await expectSmallStep(page, 2);
    await expect(stage(page)).toHaveAttribute("data-last-transition", "previous");
    // Turned back over: the slip shows its codename again, and the name is gone from the page.
    await idle(page);
    await expect(page.locator('[data-slip="2"]')).toHaveAttribute("data-face", "code");
    await expect(page.locator('[data-slip="2"] [data-part="ghost-name"]')).toHaveText("");
  });

  await test.step("mid-reveal at 7 of 12: readable from the back at three projector sizes", async () => {
    for (let step = 3; step <= 7; step++) {
      await next(page);
      await expectSmallStep(page, step);
      await idle(page);
    }
    // The bulbs light one after another, then the glow settles.
    await expectProjectorLayout(page, "mid-reveal");
    await shot(page, "mid-reveal-7-of-12");
    await atProjectorSizes(page, "mid-reveal", "mid-reveal");
  });

  await test.step("a refresh mid-reveal shows exactly the same ring", async () => {
    const before = await ringState(page);
    await page.reload();
    await expectSmallStep(page, 7);
    expect(await ringState(page)).toBe(before);
    // Nothing animates on a fresh load.
    await expect(stage(page)).toHaveAttribute("data-transitions", "0");
  });

  await test.step("sound is off by default and remembered on this device; fullscreen", async () => {
    const sound = page.getByRole("button", { name: /^Tunog: / });
    await expect(sound).toHaveText(/Tunog: off/);
    await expect(sound).toHaveAttribute("aria-pressed", "false");
    await sound.click();
    await expect(sound).toHaveText(/Tunog: on/);
    await page.reload();
    await expect(page.getByRole("button", { name: /^Tunog: / })).toHaveText(/Tunog: on/);
    await page.getByRole("button", { name: /^Tunog: / }).click();
    await expect(page.getByRole("button", { name: /^Tunog: / })).toHaveText(/Tunog: off/);

    await page.getByRole("button", { name: "Fullscreen" }).click();
    await expect(page.getByRole("button", { name: "Exit fullscreen" })).toBeVisible();
    await page.getByRole("button", { name: "Exit fullscreen" }).click();
    await expect(page.getByRole("button", { name: "Fullscreen" })).toBeVisible();
  });

  // --- A group of 30: the moving window ---------------------------------------

  const bigOrder = revealOrderOf(await getTruth(big.slug), "Andoy");

  /** Pair `step` of 30 on screen, its slip at the bottom slot of a 12-slip window. */
  async function expectBigStep(p: Page, step: number) {
    const pair = bigOrder[step - 1];
    await expect(count(p, `${step} of 30`)).toBeVisible();
    await expect(centre(p)).toContainText(`${pair.giver}!`);
    await expect(centre(p)).toContainText(`Ang monito niya: ${pair.receiver}`);
    const current = p.locator('[data-slip][aria-current="step"]');
    await expect(current).toHaveAttribute("data-slip", String(step - 1));
    await expect(current).toHaveAttribute("data-pos", "6");
    // 12 on the ring (+2 hidden), in loop order around the current pair.
    await expect(p.locator("[data-slip]")).toHaveCount(14);
    const shownSlips = () =>
      p
        .locator("[data-slip]")
        .evaluateAll((els) => els.filter((el) => Number(getComputedStyle(el).opacity) > 0.5).map((el) => Number(el.getAttribute("data-slip"))));
    // (Polled: right after a step the window may still be turning.)
    await expect.poll(shownSlips).toEqual(ringIndices(step, 30).slice(1, 13));
  }

  await test.step("a group of 30: the window of 12 around the pair on screen; only its revealed pairs leave the server", async () => {
    await openAsOrganizer(page, big);
    await page.getByRole("button", { name: "Simulan ang reveal" }).click();
    await page.getByRole("button", { name: "Oo, simulan na" }).click();
    await expectBigStep(page, 1);
    await setStep(big.slug, 14);
    await page.reload();
    await expectBigStep(page, 14);
    expectRevealPageClean(await capturePage(page, big.revealUrl), await getTruth(big.slug), bigOrder, 14);
  });

  await test.step("phone as remote: the laptop turns the window and plays the step, not a jump", async () => {
    phone = await (async () => {
      const context = await browser.newContext({ ...devices["Pixel 7"], locale: "en-PH", timezoneId: "Asia/Manila" });
      const p = await context.newPage();
      watch(p, "phone");
      return { context, page: p };
    })();
    await openAsOrganizer(phone.page, big);
    await expectBigStep(phone.page, 14);
    await expect(page.locator('[data-slip="7"]')).toHaveAttribute("data-pos", "0");

    const before = Number(await stage(page).getAttribute("data-transitions"));
    await next(phone.page);
    await expectBigStep(phone.page, 15);
    // The laptop catches the turn while it plays.
    await expect(stage(page)).toHaveAttribute("data-animating", "next", { timeout: 6_000 });
    await idle(page);
    await expectBigStep(page, 15);
    expect(Number(await stage(page).getAttribute("data-transitions"))).toBe(before + 1);
    await expect(page.locator('[data-slip="7"]')).toHaveAttribute("data-pos", "-1");
    await shot(page, "large-group-15-of-30");
    await atProjectorSizes(page, "a group of 30", "large-group");
    expectRevealPageClean(await capturePage(page, big.revealUrl), await getTruth(big.slug), bigOrder, 15);

    // Previous from the phone turns it back.
    await phone.page.getByRole("button", { name: "Previous", exact: true }).click();
    await expect(stage(page)).toHaveAttribute("data-last-transition", "previous", { timeout: 6_000 });
    await expectBigStep(page, 14);
    await idle(page);
    await next(phone.page);
    await expectBigStep(page, 15);
  });

  await test.step("reduced motion: cross-fades only, and GSAP never loads", async () => {
    const calm = await projector(browser, "laptop (reduced motion)", { reducedMotion: "reduce" });
    const js = watchJs(calm.page);
    await openAsOrganizer(calm.page, big);
    await expectBigStep(calm.page, 15);
    await calm.page.locator("body").click({ position: { x: 960, y: 540 } });
    await calm.page.keyboard.press("ArrowRight");
    await expectBigStep(calm.page, 16);
    await expect(stage(calm.page)).toHaveAttribute("data-last-transition", "next");
    await idle(calm.page);
    // No flip: the revealed slip isn't turned in 3D, its faces swap by opacity.
    const flip = await calm.page.locator('[data-slip="15"] [data-part="flip"]').evaluate((el) => getComputedStyle(el).transform);
    expect(flip).toBe("none");
    await calm.page.keyboard.press("ArrowLeft");
    await expectBigStep(calm.page, 15);
    await calm.page.waitForLoadState("networkidle");
    expect((await js.settled()).some((f) => f.gsap), "GSAP with reduced motion").toBe(false);
    await calm.context.close();
    await expectBigStep(page, 15);
  });

  await test.step("finale for 30: \"Ilawan ang parol\", every bulb and slip lit, gold stars, then every pair", async () => {
    await setStep(big.slug, 29);
    const js = watchJs(page);
    await page.reload();
    await expectBigStep(page, 29);
    await idle(page);
    await next(page);
    await expectBigStep(page, 30);
    await expect(page.getByRole("button", { name: "Ilawan ang parol" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect((await js.settled()).some((f) => f.confetti), "confetti is ready on the last pair").toBe(true);
    // Everything is revealed by now; the screen got all of the window's pairs, nothing else.
    expectRevealPageClean(await capturePage(page, big.revealUrl), await getTruth(big.slug), bigOrder, 30);
    await idle(page);

    await page.getByRole("button", { name: "Ilawan ang parol" }).click();
    await expect(page.getByRole("heading", { name: "Maligayang Pasko!" })).toBeVisible();
    await expect(stage(page)).toHaveAttribute("data-animating", "finale");
    await expect(stage(page)).toHaveAttribute("data-finale", "true");
    await page.waitForTimeout(1300);
    await shot(page, "finale-30");
    // After the finale: the full list of pairs, in loop order.
    const all = page.getByRole("list", { name: "All pairs" });
    await expect(all).toBeVisible({ timeout: 10_000 });
    await expect(all.getByRole("listitem")).toHaveCount(30);
    for (const [i, pair] of bigOrder.entries()) {
      await expect(all.getByRole("listitem").nth(i)).toHaveText(new RegExp(`^${pair.giver}\\s*→ kay ${pair.receiver}$`));
    }
    await expect(page.locator("footer p").first()).toHaveText("E2E Office Party · 30 of 30");
    // The list sits on a solid gabi panel, so the parol's gold lines don't cross the names (persona test M2).
    await expect(page.locator(".rv-list-scroll")).toHaveCSS("background-color", "rgb(30, 18, 56)");
    await shot(page, "all-pairs-30");
    await atProjectorSizes(page, "all pairs", "all-pairs");
    await page.getByRole("button", { name: "Balik sa parol" }).click();
    await expect(page.locator('[data-slip][data-halo="true"]')).toHaveCount(14);
    await expect(page.locator('[data-bulb][data-state="glow"]')).toHaveCount(56);
    // The phone follows to the end too.
    await expect(phone!.page.locator("footer p").first()).toHaveText("E2E Office Party · 30 of 30", { timeout: 6_000 });
    // A refresh after the end goes straight to the list.
    await page.reload();
    await expect(page.getByRole("list", { name: "All pairs" }).getByRole("listitem")).toHaveCount(30);
  });

  await test.step("finale for 12: the parol lights on the ring", async () => {
    await setStep(small.slug, 12);
    await openAsOrganizer(page, small);
    await expectSmallStep(page, 12);
    await idle(page);
    await page.getByRole("button", { name: "Ilawan ang parol" }).click();
    await expect(page.getByRole("heading", { name: "Maligayang Pasko!" })).toBeVisible();
    await expect(stage(page)).toHaveAttribute("data-last-transition", "finale");
    await page.waitForTimeout(1300);
    await shot(page, "finale-12");
    await idle(page);
    await expect(page.locator('[data-slip][data-halo="true"]')).toHaveCount(12);
    await expect(page.locator('[data-bulb][data-state="glow"]')).toHaveCount(48);
    await expectProjectorLayout(page, "finale for 12");
    await shot(page, "finale-12-settled");
    // Up to 16, the ring is the list; the full list is a tap away.
    await page.getByRole("button", { name: "Lahat ng pairs" }).click();
    await expect(page.getByRole("list", { name: "All pairs" }).getByRole("listitem")).toHaveCount(12);
  });

  await test.step("no console errors", async () => {
    await phone?.context.close();
    await laptop.context.close();
    expect(problems, problems.join("\n")).toEqual([]);
  });
});

test("projector mode: controls hide after 3 s without the mouse, keys still work, the group name is never cut", async ({ browser }) => {
  test.setTimeout(180_000);
  const group = await seedGroup("Barkada Christmas 2026", TWELVE);
  const { context, page } = await projector(browser, "projector mode");
  await openAsOrganizer(page, group);
  await page.getByRole("button", { name: "Simulan ang reveal" }).click();
  await page.getByRole("button", { name: "Oo, simulan na" }).click();
  await expect(count(page, "1 of 12")).toBeVisible();
  await idle(page);

  const header = page.locator("header.rv-autohide");
  const buttons = page.locator("footer.rv-autohide");
  const info = page.locator("footer:has([data-count])");
  await page.mouse.move(960, 540);
  await expect(header).toHaveCSS("opacity", "1");
  await expect(buttons).toHaveCSS("opacity", "1");

  await test.step("hidden after 3 s without the mouse; the group name and count stay", async () => {
    await page.waitForTimeout(3500);
    await expect(header).toHaveCSS("opacity", "0");
    await expect(buttons).toHaveCSS("opacity", "0");
    await expect(info).toHaveCSS("opacity", "1");
    await shot(page, "projector-mode-hidden");
  });

  await test.step("Space still moves on while they're hidden", async () => {
    await page.keyboard.press("Space");
    await expect(count(page, "2 of 12")).toBeVisible();
    await expect(header).toHaveCSS("opacity", "0");
  });

  await test.step("a mouse move or a tap brings them back", async () => {
    await page.mouse.move(400, 300);
    await expect(header).toHaveCSS("opacity", "1");
    await expect(buttons).toHaveCSS("opacity", "1");
    await page.waitForTimeout(3500);
    await expect(header).toHaveCSS("opacity", "0");
    await page.mouse.down();
    await page.mouse.up();
    await expect(header).toHaveCSS("opacity", "1");
  });

  await test.step("keyboard focus shows them", async () => {
    await page.waitForTimeout(3500);
    await expect(header).toHaveCSS("opacity", "0");
    await page.keyboard.press("Tab");
    // Whichever control group holds the keyboard focus shows again.
    await expect(page.locator(".rv-autohide:has(:focus-visible)")).toHaveCSS("opacity", "1");
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  });

  await test.step("the full group name, never cut short, at 1920×1080, 1366×768 and 1280×720", async () => {
    for (const [w, h] of [
      [1920, 1080],
      [1366, 768],
      [1280, 720],
    ]) {
      await page.setViewportSize({ width: w, height: h });
      await expect(page.locator("footer p").first()).toHaveText("E2E Barkada Christmas 2026 · 2 of 12");
      const cut = await page.locator("footer p span").first().evaluate((el) => el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight);
      expect(cut, `the group name is cut short at ${w}×${h}`).toBe(false);
      await expectProjectorLayout(page, `projector mode at ${w}×${h}`);
    }
  });

  await context.close();
  expect(problems, problems.join("\n")).toEqual([]);
});
