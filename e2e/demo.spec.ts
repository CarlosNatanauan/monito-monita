/**
 * The one-click demo, on phones and the laptop: start it from the landing
 * page, unfold the slip, the organizer page (reminder, remove, redraw),
 * the party reveal to the finale, Reset demo, a shared link (closed), and
 * leak checks at each stage. On the laptop the reveal's "Gawing remote
 * ang phone mo" QR is checked against the organizer's real link.
 *
 * The visitor is "E2E Migs", so the global teardown can find demo groups a
 * failed run leaves behind. Each demo made here is deleted at the end.
 */
import type { Locator, Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { expect, test } from "./test";
import { qrPath } from "../lib/qr";
import { closeDb, db } from "../server/db";
import { groups } from "../server/db/schema";
import { DEMO_BANNER } from "../server/demo";
import { deleteGroups, E2E_PREFIX } from "./db-cleanup";
import { navigate, openSlip, people, screenshotter, tapToOpen } from "./flow";
import {
  capturePage,
  expectJoinPageClean,
  expectMemberPageClean,
  expectOrganizerPageClean,
  expectRevealPageClean,
  getTruth,
  revealOrderOf,
} from "./leak";

const VISITOR = `${E2E_PREFIX}Migs`;
const createdSlugs: string[] = [];

test.afterAll(async () => {
  await deleteGroups(createdSlugs);
  await closeDb();
});

const slugOf = (page: Page) => /\/g\/([a-z0-9]+)\//.exec(page.url())![1];

async function groupRow(slug: string) {
  const [row] = await db().select().from(groups).where(eq(groups.slug, slug));
  return row;
}

/** None of `items` overlaps a slip on the reveal stage. */
async function expectClearOfSlips(page: Page, items: Locator[]) {
  const slips = await page.locator("[data-slip]").all();
  expect(slips.length).toBeGreaterThan(0);
  for (const item of items) {
    const a = (await item.boundingBox())!;
    for (const slip of slips) {
      const b = (await slip.boundingBox())!;
      const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      expect(overlap, `${await item.textContent()} overlaps slip ${await slip.getAttribute("data-slip")}`).toBe(false);
    }
  }
}

test("demo: start, unfold, organizer, reveal to the finale, reset, leaks", async ({ browser }, testInfo) => {
  const shot = screenshotter(testInfo, "demo");
  const { problems, newPerson } = people(browser, testInfo);
  const visitor = await newPerson("Visitor");
  const { page } = visitor;
  const landscape = (() => {
    const { width, height } = page.viewportSize()!;
    return width > height;
  })();
  const guide = () => page.locator("[data-demo-guide]").filter({ visible: true });
  let slug = "";

  await test.step("landing: the demo button sits by Create your group; /demo is noindex", async () => {
    await navigate(page, "/");
    const create = page.getByRole("link", { name: "Create your group" });
    const demo = page.getByRole("link", { name: "Subukan ang demo" });
    await expect(demo).toBeVisible();
    await expect(demo).toHaveAttribute("href", "/demo");
    // One filled button per screen: the demo is the secondary one.
    await expect(create).toHaveAttribute("data-variant", "default");
    await expect(demo).toHaveAttribute("data-variant", "secondary");
    if (landscape) {
      // Laptop: in the first screen, right beside the main button.
      await expect(demo).toBeInViewport();
      const [a, b] = [await create.boundingBox(), await demo.boundingBox()];
      expect(Math.abs(a!.y - b!.y), "same row as Create your group").toBeLessThan(10);
    }
    await shot(page, "landing");

    const response = await page.request.get("/demo");
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
    await demo.click();
    await expect(page).toHaveURL(/\/demo$/);
    await expect(page.getByRole("heading", { name: "Subukan ang demo" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await shot(page, "demo-start");
  });

  await test.step("start: a fresh drawn demo group, the visitor's slip still folded", async () => {
    await page.getByLabel("Pangalan mo").fill(VISITOR);
    await page.getByRole("button", { name: "Simulan ang demo" }).click();
    await expect(page).toHaveURL(/\/g\/[a-z0-9]+\/me$/, { timeout: 30_000 });
    slug = slugOf(page);
    createdSlugs.push(slug);

    const row = await groupRow(slug);
    expect(row).toMatchObject({ isDemo: true, status: "DRAWN" });
    expect(row.demoExpiresAt!.getTime() - Date.now()).toBeGreaterThan(23 * 3600_000);

    await expect(page.getByRole("heading", { name: `Hi, ${VISITOR}!` })).toBeVisible();
    await expect(tapToOpen(page)).toBeVisible();
    await expect(guide().getByText(DEMO_BANNER)).toBeVisible();
    const steps = guide().getByRole("list", { name: "Subukan sa demo" });
    await expect(steps.getByRole("listitem")).toHaveCount(4);
    await expect(steps.getByText("My slip")).toHaveAttribute("aria-current", "page");
    await expect(steps.getByRole("link", { name: "Manage group" })).toHaveAttribute("href", `/g/${slug}/admin`);
    await expect(steps.getByRole("link", { name: "Reveal" })).toHaveAttribute("href", `/g/${slug}/reveal`);
    await expect(steps.getByRole("link", { name: "Gumawa ng totoong group" })).toHaveAttribute("href", "/new");
    await expect(guide().getByRole("button", { name: "Reset demo" })).toBeVisible();
    // Organizer and member: the folder tabs.
    await expect(page.getByRole("link", { name: "Manage group" }).first()).toBeVisible();
    // No PIN card in a demo.
    await expect(page.getByText("Mag-set ng PIN")).toHaveCount(0);
    await shot(page, "me-folded");

    expectMemberPageClean(await capturePage(page, `/g/${slug}/me`), await getTruth(slug), VISITOR);
  });

  let receiver = "";
  await test.step("unfold the slip: one receiver, with their wishlist", async () => {
    receiver = await openSlip(page);
    const truth = await getTruth(slug);
    const me = truth.members.find((m) => m.name === VISITOR)!;
    const expected = truth.members.find((m) => m.id === truth.pairs.find((p) => p.giverId === me.id)!.receiverId)!;
    expect(receiver).toBe(expected.name);
    const wishes = truth.wishes.filter((w) => w.memberId === expected.id);
    expect(wishes.length).toBeGreaterThan(0);
    const list = page.getByRole("list", { name: "Wishlist ng monito mo" });
    await expect(list.getByRole("listitem")).toHaveCount(wishes.length);
    // A wish of their own works too.
    await page.getByLabel("Ano ang gusto mo?").fill("Libro ni Bob Ong");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("list", { name: "Wishlist mo" }).getByText("Libro ni Bob Ong", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit Libro ni Bob Ong" })).toBeVisible();
    await shot(page, "me-opened");
    expectMemberPageClean(await capturePage(page, `/g/${slug}/me`), await getTruth(slug), VISITOR);
  });

  await test.step("organizer page: dashboard, GC reminder, bawal pair, remove, redraw", async () => {
    await guide().getByRole("link", { name: "Manage group" }).click();
    await expect(page).toHaveURL(new RegExp(`/g/${slug}/admin$`));
    await expect(page.getByText("Na-draw na ang names")).toBeVisible();
    await expect(guide().getByText("Manage group")).toHaveAttribute("aria-current", "page");
    const members = page.getByRole("list", { name: "Members" });
    await expect(members.getByRole("listitem")).toHaveCount(9);
    await expect(page.getByRole("list", { name: "Exclusion pairs" }).getByRole("listitem")).toHaveCount(1);
    await expect(page.getByText(/^6 of 9 have opened their slip$/)).toBeVisible();
    // The GC reminder copies.
    await page.evaluate(() => {
      Object.defineProperty(navigator.clipboard, "writeText", { configurable: true, value: async () => {} });
    });
    await page.getByRole("button", { name: /^Copy (reminder|announcement)$/ }).click();
    await expect(page.getByRole("button", { name: "Copied!" })).toBeVisible();
    await shot(page, "admin");
    expectOrganizerPageClean(await capturePage(page, `/g/${slug}/admin`), await getTruth(slug));

    // Remove a made-up member (patched, or removed with a redraw if the patch would pair the bawal couple).
    await page.getByRole("button", { name: "Manage Mang Jun", exact: true }).click();
    await page.getByRole("button", { name: "Remove Mang Jun", exact: true }).click();
    await page.getByRole("button", { name: "Oo, tanggalin" }).click();
    const redraw = page.getByRole("button", { name: "Tanggalin at i-redraw" });
    if (await redraw.isVisible().catch(() => false)) await redraw.click();
    await expect(members.getByText("Mang Jun", { exact: true })).toHaveCount(0);
    await expect(members.getByRole("listitem")).toHaveCount(8);

    // Redraw everyone.
    await page.getByRole("button", { name: "Redraw" }).click();
    await page.getByRole("button", { name: "Oo, i-redraw" }).click();
    await expect(page.getByText("0 of 8 have opened their slip")).toBeVisible();
    expectOrganizerPageClean(await capturePage(page, `/g/${slug}/admin`), await getTruth(slug));
  });

  await test.step("the new monito unfolds again on /me", async () => {
    await guide().getByRole("link", { name: "My slip" }).click();
    receiver = await openSlip(page);
    expectMemberPageClean(await capturePage(page, `/g/${slug}/me`), await getTruth(slug), VISITOR);
  });

  const revealUrl = () => `/g/${slug}/reveal`;
  await test.step("reveal: ready screen, the demo note, and (laptop) the remote's QR", async () => {
    await navigate(page, `/g/${slug}/admin`);
    await guide().getByRole("link", { name: "Reveal" }).click();
    await expect(page).toHaveURL(new RegExp(`${revealUrl()}$`));
    await expect(page.getByRole("heading", { name: "Handa na?" }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText(DEMO_BANNER).filter({ visible: true })).toBeVisible();
    const truth = await getTruth(slug);
    expectRevealPageClean(await capturePage(page, revealUrl()), truth, revealOrderOf(truth, VISITOR), 0);

    const qrToggle = page.getByRole("button", { name: "Ipakita ang QR" });
    if (!landscape) {
      // A phone held upright is the remote itself: no stage, no QR.
      await expect(qrToggle).toBeHidden();
      await shot(page, "reveal-ready");
      return;
    }
    // The demo tag and links stay clear of every slip on the ring.
    await expectClearOfSlips(page, [
      page.getByText(DEMO_BANNER).filter({ visible: true }),
      page.getByRole("link", { name: "My slip" }).filter({ visible: true }),
      page.getByRole("button", { name: "Reset demo" }).filter({ visible: true }),
    ]);

    // Hidden until asked for (the screen may already be on the projector).
    const qr = page.getByRole("img", { name: "QR code ng organizer link" });
    await expect(qr).toHaveCount(0);
    await shot(page, "reveal-ready");
    await qrToggle.click();
    await expect(qr).toBeVisible();
    await expect(page.getByText("I-scan gamit ang phone mo.")).toBeVisible();
    // The copy fallback stays.
    await expect(page.getByRole("button", { name: /^(I-send sa phone ko|Copy organizer link)$/ })).toBeVisible();
    // It encodes this organizer's own link, exactly.
    const token = (await visitor.context.cookies()).find((c) => c.name === `mm_o_${slug}`)!.value;
    const link = `${new URL(page.url()).origin}/g/${slug}/admin?t=${token}`;
    expect(await qr.locator("path").getAttribute("d")).toBe(qrPath(link).d);
    // Big enough for arm's length: at least ~240px on a 1366 laptop, inside the ring's centre.
    const box = (await qr.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(240);
    const centre = (await page.locator(".rv-centre").boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(centre.y + centre.height + 1);
    await shot(page, "reveal-qr");
    await page.getByRole("button", { name: "Itago ang QR" }).click();
    await expect(qr).toHaveCount(0);
  });

  await test.step("reveal: every pair, then the finale", async () => {
    await page.getByRole("button", { name: "Simulan ang reveal" }).click();
    await page.getByRole("button", { name: "Oo, simulan na" }).click();
    const truth = await getTruth(slug);
    const order = revealOrderOf(truth, VISITOR);
    const total = order.length;
    expect(total).toBe(8);
    // No QR once the reveal has started.
    await expect(page.getByRole("button", { name: "Ipakita ang QR" })).toHaveCount(0);
    for (let step = 1; step <= total; step++) {
      await expect(page.getByText(`${step} of ${total}`, { exact: true }).filter({ visible: true })).toBeVisible();
      await expect(page.getByRole("region", { name: "Reveal" }).filter({ visible: true })).toContainText(`${order[step - 1].giver}!`);
      if (step === 1 || step === 4) {
        expectRevealPageClean(await capturePage(page, revealUrl()), truth, order, step);
        if (step === 4) await shot(page, "reveal-step-4");
      }
      await page.getByRole("button", { name: step === total ? "Ilawan ang parol" : "Next", exact: true }).click();
    }
    await expect(page.getByRole("heading", { name: "Maligayang Pasko!" }).filter({ visible: true })).toBeVisible();
    if (landscape) await expect(page.locator(".rv-stage")).toHaveAttribute("data-last-transition", "finale");
    await shot(page, "reveal-finale");
    expect((await groupRow(slug)).status).toBe("REVEALED");
  });

  await test.step("after the reveal: /me shows who gave to the visitor", async () => {
    await navigate(page, `/g/${slug}/me`);
    await expect(page.getByRole("region", { name: "Ang nagbigay sa'yo" })).toContainText("Ang nagbigay sa'yo ay…");
    await expect(guide().getByText(DEMO_BANNER)).toBeVisible();
    expectMemberPageClean(await capturePage(page, `/g/${slug}/me`), await getTruth(slug), VISITOR, { revealed: true });
  });

  await test.step("a shared link can't join a demo", async () => {
    const stranger = await newPerson("Stranger");
    const text = await capturePage(stranger.page, `/g/${slug}`);
    await expect(stranger.page.getByRole("heading", { name: "Demo group 'to" })).toBeVisible();
    await expect(stranger.page.getByRole("link", { name: "Subukan ang demo" })).toHaveAttribute("href", "/demo");
    await expect(stranger.page.getByLabel("4-digit PIN")).toHaveCount(0);
    expectJoinPageClean(text, await getTruth(slug));
    await shot(stranger.page, "shared-link-closed");
    await stranger.context.close();
  });

  await test.step("Reset demo: a fresh demo, slip folded again; the old one is gone", async () => {
    const old = slug;
    await guide().getByRole("button", { name: "Reset demo" }).click();
    await expect(page).not.toHaveURL(new RegExp(`/g/${old}/`), { timeout: 30_000 });
    await expect(page).toHaveURL(/\/g\/[a-z0-9]+\/me$/);
    slug = slugOf(page);
    createdSlugs.push(slug);
    expect(await groupRow(old)).toBeUndefined();
    expect(await groupRow(slug)).toMatchObject({ isDemo: true, status: "DRAWN" });
    await expect(page.getByRole("heading", { name: `Hi, ${VISITOR}!` })).toBeVisible();
    await expect(tapToOpen(page)).toBeVisible();
    await expect(guide().getByText(DEMO_BANNER)).toBeVisible();
    await shot(page, "me-after-reset");
  });

  await test.step("no console errors on any page", async () => {
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
