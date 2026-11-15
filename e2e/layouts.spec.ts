/**
 * Responsive layouts: every page at 8 sizes, from a small Android phone to
 * a 1080p laptop. Each page must fit the width (no sideways scroll), and
 * on tablets and laptops the two-column layouts must actually sit side by
 * side. Full-page screenshots go to e2e/screenshots/layouts/{size}/.
 *
 * Groups are seeded straight into the DEV database (no clicking through
 * the flow) and deleted afterwards. Runs in the laptop project (Chromium);
 * it sets each size itself.
 */
import { mkdirSync, rmSync } from "node:fs";
import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { closeDb } from "../server/db";
import { deleteGroups } from "./db-cleanup";
import { seedGroup, type SeededGroup } from "./seed";

const createdSlugs: string[] = [];
test.afterAll(async () => {
  await deleteGroups(createdSlugs);
  await closeDb();
});

interface Size {
  name: string;
  width: number;
  height: number;
  /** A phone: touch, mobile viewport meta, 2-3x pixels. */
  phone?: boolean;
  touch?: boolean;
}

export const SIZES: Size[] = [
  { name: "360x740-small-android", width: 360, height: 740, phone: true },
  { name: "390x844-iphone", width: 390, height: 844, phone: true },
  { name: "430x932-large-phone", width: 430, height: 932, phone: true },
  { name: "844x390-phone-landscape", width: 844, height: 390, phone: true },
  { name: "768x1024-ipad", width: 768, height: 1024, touch: true },
  { name: "1024x768-ipad-landscape", width: 1024, height: 768, touch: true },
  { name: "1366x768-laptop", width: 1366, height: 768 },
  { name: "1920x1080-laptop", width: 1920, height: 1080 },
];

const PEOPLE = ["Joy", "Marco", "Carlo", "Bea", "Paolo", "Tita Luz", "Jun", "Aira"];
const WISHES = {
  Joy: [
    { title: "Mug na cute (blue)", url: "www.example.com/mug", note: "Kahit anong kulay" },
    { title: "Plant (small lang)" },
  ],
  Marco: [{ title: "Notebook" }, { title: "Socks", note: "Size 9" }, { title: "Coffee beans" }],
  Carlo: [{ title: "Earphones" }],
};

let open: SeededGroup;
let drawn: SeededGroup;
let settled: SeededGroup;
let stickyGroup: SeededGroup;

// The sticky-slip check unfolds a slip, so each size gets its own member.
const STICKY_PEOPLE: Record<string, string> = {
  "1024x768-ipad-landscape": "Bebeng",
  "1366x768-laptop": "Celso",
  "1920x1080-laptop": "Dindo",
};
const LONG_WISHLIST = Array.from({ length: 10 }, (_, i) => ({
  title: `Gift idea ${i + 1}`,
  note: "Kahit anong kulay, basta cute. Puwede rin sa Shopee.",
}));

test.beforeAll(async () => {
  // Before the draw: 8 members, wishlists, one bawal pair.
  open = await seedGroup(
    { name: "Layout Barkada", people: PEOPLE, wishes: WISHES, exclusions: [["Joy", "Marco"]] },
    createdSlugs,
  );
  // Just drawn: Joy has opened her slip, Marco hasn't.
  drawn = await seedGroup(
    { name: "Layout Opisina", people: PEOPLE, wishes: WISHES, draw: true, opened: ["Joy"] },
    createdSlugs,
  );
  // Later: most have opened (the usual after-draw organizer page).
  settled = await seedGroup(
    { name: "Layout Pamilya", people: PEOPLE, wishes: WISHES, draw: true, opened: PEOPLE.slice(0, 6) },
    createdSlugs,
  );
  // Long wishlists, so the right column scrolls well past the slip.
  const sticky = Object.values(STICKY_PEOPLE);
  stickyGroup = await seedGroup(
    {
      name: "Layout Sticky",
      people: sticky,
      wishes: Object.fromEntries(sticky.map((name) => [name, LONG_WISHLIST])),
      draw: true,
    },
    createdSlugs,
  );
});

async function contextFor(browser: Browser, size: Size) {
  return browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: size.phone ? 2 : 1,
    isMobile: Boolean(size.phone),
    hasTouch: Boolean(size.phone || size.touch),
    locale: "en-PH",
    timezoneId: "Asia/Manila",
  });
}

/** No sideways scrolling, and no element sticking out past the right edge. */
async function expectFitsWidth(page: Page, label: string) {
  const result = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const scroll = document.documentElement.scrollWidth;
    const wide: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("main *, body > div *")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // Clipped on purpose (the slip's halo, the bowl's arch): skip what an ancestor clips.
      let clipped = false;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX;
        if (o === "hidden" || o === "clip" || o === "auto" || o === "scroll") {
          clipped = true;
          break;
        }
      }
      if (!clipped && r.right > vw + 1) wide.push(`${el.tagName.toLowerCase()}.${el.className.toString().slice(0, 60)}`);
    }
    return { vw, scroll, wide: wide.slice(0, 5) };
  });
  expect(result.scroll, `${label}: page scrolls sideways (${result.wide.join(", ")})`).toBeLessThanOrEqual(result.vw);
  expect(result.wide, `${label}: elements past the right edge`).toEqual([]);
}

function shooter(size: Size) {
  const dir = `e2e/screenshots/layouts/${size.name}`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  let n = 0;
  return async (page: Page, name: string) => {
    n += 1;
    await expectFitsWidth(page, `${name} at ${size.name}`);
    await page.screenshot({ path: `${dir}/${String(n).padStart(2, "0")}-${name}.png`, fullPage: true, caret: "initial" });
  };
}

async function box(locator: Locator) {
  const b = await locator.boundingBox();
  if (!b) throw new Error(`no box for ${locator}`);
  return b;
}

/**
 * From `from` px (laptops, 1024; the organizer page, 840), `right` sits in a
 * column to the right of `left`; below that it sits underneath it
 * (docs/DESIGN.md, "Layout").
 */
async function expectColumns(size: Size, left: Locator, right: Locator, label: string, from = 1024) {
  const [a, b] = [await box(left), await box(right)];
  if (size.width >= from) {
    expect(b.x, `${label}: side by side at ${size.name}`).toBeGreaterThanOrEqual(a.x + a.width - 1);
  } else {
    expect(b.y, `${label}: stacked at ${size.name}`).toBeGreaterThanOrEqual(a.y + a.height - 1);
  }
}

/** Wait for fonts and for client components to settle. */
async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
}

for (const size of SIZES) {
  test(`every page fits at ${size.name}`, async ({ browser }) => {
    test.setTimeout(240_000);
    const shot = shooter(size);

    // --- Landing and create (no group) ---
    const visitor = await contextFor(browser, size);
    const page = await visitor.newPage();
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Isang link lang para sa buong bunutan." })).toBeVisible();
    await settle(page);
    await expectColumns(size, page.getByRole("heading", { name: "Isang link lang para sa buong bunutan." }), page.getByRole("region", { name: "Try a bunutan" }), "landing hero | arch");
    // "Paano 'to?": three lines on the listahan, at every width.
    const steps = page.getByRole("list", { name: "Paano 'to?" }).getByRole("listitem");
    await expect(steps).toHaveCount(3);
    const [s1, s3] = [await box(steps.first()), await box(steps.last())];
    expect(s3.y - s1.y, "steps on the 40px rules").toBe(80);
    await shot(page, "landing");

    // Returning visitor: "Your groups" under the main button.
    await page.evaluate((slug) => {
      localStorage.setItem(
        "mm:groups",
        JSON.stringify([
          { slug, name: "E2E Layout Barkada", roles: ["organizer", "member"], seenAt: Date.now() },
          { slug: "zzzzzzzzzzzz", name: "Opisina 2026", roles: ["member"], seenAt: 1 },
        ]),
      );
    }, open.slug);
    await page.reload();
    await expect(page.getByRole("region", { name: "Your groups" })).toBeVisible();
    await shot(page, "landing-your-groups");

    await page.goto("/new");
    await expect(page.getByRole("heading", { name: "Gumawa ng group" })).toBeVisible();
    await settle(page);
    await expectColumns(size, page.getByLabel("Pangalan ng group"), page.getByText("Preview sa GC"), "new form | GC preview");
    // Said once until there is a date, then each theme's own start date.
    await expect(page.getByText("Starts once you pick the party date.")).toHaveCount(1);
    await expect(page.getByText(/^Starts [A-Z][a-z]{2} \d{1,2}$/)).toHaveCount(0);
    // The live GC preview: the invite, at every width.
    const preview = page.getByLabel("Invite preview");
    await expect(preview).toContainText("Sali na sa exchange gift natin!");
    await shot(page, "new");
    await page.getByLabel("Pangalan ng group").fill("Barkada Christmas Party");
    await page.getByLabel("Budget", { exact: true }).fill("500");
    await page.getByLabel("Petsa ng party").fill(open.partyDate);
    await expect(page.getByText("Starts once you pick the party date.")).toHaveCount(0);
    await expect(page.getByText(/^Starts [A-Z][a-z]{2} \d{1,2}$/)).toHaveCount(4);
    await expect(preview).toContainText("🎁 Monito Monita: Barkada Christmas Party");
    await expect(preview).toContainText("Budget: ₱500");
    await shot(page, "new-filled");

    // --- Join and come back ---
    await page.goto(open.sharePath);
    await expect(page.getByRole("heading", { name: open.name })).toBeVisible();
    await settle(page);
    await expectColumns(size, page.getByRole("heading", { name: open.name }), page.getByRole("form", { name: "Sumali" }), "join info | form");
    await shot(page, "join");
    await page.goto(`${open.sharePath}?bumalik=1`);
    await expect(page.getByRole("heading", { name: "Welcome back!" })).toBeVisible();
    await settle(page);
    await expectColumns(size, page.getByRole("heading", { name: "Welcome back!" }), page.getByRole("form", { name: "Bumalik" }), "come-back info | form");
    await shot(page, "come-back");
    await page.goto(drawn.sharePath);
    await expect(page.getByText("Tapos na ang bunutan")).toBeVisible();
    await shot(page, "join-closed");
    await visitor.close();

    // --- /me ---
    const member = await contextFor(browser, size);
    const me = await member.newPage();
    await me.goto(open.members.Joy.link);
    await expect(me.getByRole("heading", { name: "Hi, Joy!" })).toBeVisible();
    await settle(me);
    await shot(me, "me-before-draw");

    await me.goto(drawn.members.Marco.link);
    await expect(me.getByRole("button", { name: "Tap to open your bunutan" })).toBeVisible();
    await settle(me);
    await expectColumns(size, me.getByRole("region", { name: "Your monito" }), me.getByRole("list", { name: "Wishlist mo" }), "me slip | rest");
    // After the draw the theme sheet sits under the slip on laptops (balancing
    // the columns) and in the rest on phones; one copy is displayed either way.
    const themeSheet = me.getByRole("region", { name: "Theme this week" });
    await expect(themeSheet).toHaveCount(1);
    if (size.width >= 1024) {
      const [slipBox, themeBox] = [await box(me.getByRole("region", { name: "Your monito" })), await box(themeSheet)];
      expect(themeBox.x, "theme sheet in the slip column").toBeLessThan(slipBox.x + slipBox.width);
    }
    await shot(me, "me-folded");

    await member.close();

    // A different member of the same group: a fresh phone (else /me asks before switching).
    const joy = await contextFor(browser, size);
    const opened = await joy.newPage();
    await opened.goto(drawn.members.Joy.link);
    await expect(opened.getByText("Ang monito mo ay…")).toBeVisible();
    await expect(opened.getByText(/^Wishlist ni /)).toBeVisible();
    await settle(opened);
    await expectColumns(size, opened.getByRole("region", { name: "Your monito" }), opened.getByText(/^Wishlist ni /), "me slip | their wishlist");
    await shot(opened, "me-opened");
    await joy.close();

    // Tall enough screens: the slip stays in view while the right column
    // scrolls, and the unfold still plays from there.
    if (STICKY_PEOPLE[size.name]) {
      const carlo = await contextFor(browser, size);
      const sticky = await carlo.newPage();
      await sticky.goto(stickyGroup.members[STICKY_PEOPLE[size.name]].link);
      const slip = sticky.getByRole("region", { name: "Your monito" });
      // Scrolled to the bottom: the slip is still fully in view.
      const expectStuck = async (minScroll: number, label: string) => {
        await sticky.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        const scrolled = await sticky.evaluate(() => window.scrollY);
        expect(scrolled, `${label}: the page scrolls well past the top`).toBeGreaterThan(minScroll);
        const r = await box(slip);
        expect(r.y, `${label}: slip stays in view (sticky)`).toBeGreaterThanOrEqual(0);
        expect(r.y + r.height).toBeLessThanOrEqual(size.height);
      };
      await expect(sticky.getByRole("button", { name: "Tap to open your bunutan" })).toBeVisible();
      // Folded, only the own wishlist is on the right (the theme sheet sits under the slip).
      await expectStuck(200, "folded");
      await sticky.getByRole("button", { name: "Tap to open your bunutan" }).click();
      await expect(sticky.getByRole("button", { name: "Tap to open your bunutan" })).toHaveCount(0, { timeout: 15_000 });
      await expect(sticky.getByText("Ang monito mo ay…")).toBeVisible();
      await expect(sticky.getByText(/^Wishlist ni /)).toBeVisible();
      await shot(sticky, "me-sticky-unfolded");
      // Opened, the receiver's 10-item wishlist joins the right column.
      await expectStuck(300, "opened");
      await carlo.close();
    }

    // --- Organizer ---
    const organizer = await contextFor(browser, size);
    const admin = await organizer.newPage();
    await admin.goto(open.organizerPath);
    await expect(admin.getByRole("heading", { name: open.name })).toBeVisible();
    await settle(admin);
    await expectColumns(size, admin.getByRole("button", { name: "Draw names" }), admin.getByRole("list", { name: "Members" }), "admin draw | members", 840);
    await shot(admin, "admin-before-draw");

    await admin.goto(drawn.organizerPath);
    await expect(admin.getByText("1 of 8 have opened their slip")).toBeVisible();
    await settle(admin);
    await expectColumns(size, admin.getByText("1 of 8 have opened their slip"), admin.getByRole("list", { name: "Members" }), "admin lights | members", 840);
    await shot(admin, "admin-just-drawn");

    await admin.goto(settled.organizerPath);
    await expect(admin.getByText("6 of 8 have opened their slip")).toBeVisible();
    await settle(admin);
    await shot(admin, "admin-after-draw");
    await organizer.close();
  });
}
