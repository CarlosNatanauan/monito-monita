/**
 * Main flow, part 4 of 4, on a phone: the party reveal. Organizer only,
 * the ready screen, starting (redraw and remove locked), Next / Previous,
 * a refresh and a second device resuming at the same pair, the phone as
 * remote for the laptop, the auto-refresh only while visible, the finale,
 * and each /me showing its own giver afterwards. Leak test at each stage.
 *
 * Starts from a seeded, drawn group of 3: Joy M, Tita Org (the organizer)
 * and Ben, in join order. The projector layouts at 1080p are in
 * reveal.spec.ts.
 */
import type { Page, Request } from "@playwright/test";
import { expect, test } from "./test";
import { closeDb } from "../server/db";
import { deleteGroups } from "./db-cleanup";
import { expectCardOrder, navigate, people, screenshotter, type Person } from "./flow";
import {
  capturePage,
  expectJoinPageClean,
  expectMemberPageClean,
  expectOrganizerPageClean,
  expectRevealPageClean,
  getTruth,
  revealOrderOf,
} from "./leak";
import { seedGroup } from "./seed";

const createdSlugs: string[] = [];

test.afterAll(async () => {
  await deleteGroups(createdSlugs);
  await closeDb();
});

test("party reveal: start, steps, phone as remote, finale, leaks", async ({ browser }, testInfo) => {
  const shot = screenshotter(testInfo, "flow-4-reveal");
  const { problems, newPerson, loggedIn } = people(browser, testInfo);
  const group = await seedGroup(
    { name: `Reveal (${testInfo.project.name})`, people: ["Joy M", "Tita Org", "Ben"], draw: true, opened: ["Joy M", "Tita Org", "Ben"] },
    createdSlugs,
  );
  const slug = group.slug;
  const shareUrl = new URL(group.sharePath, testInfo.project.use.baseURL).href;
  const organizerUrl = group.organizerPath;
  const organizer = await loggedIn("organizer", group.organizerPath, group.members["Tita Org"].link);
  const joyM = await loggedIn("Joy M", group.members["Joy M"].link);
  const ben = await loggedIn("Ben", group.members.Ben.link);

  // 3 active members left: Joy M, Tita Org (the organizer), Ben, in join order.

  const stillIn = [
    { label: "Joy M", person: joyM },
    { label: "Tita Org", person: organizer },
    { label: "Ben", person: ben },
  ];
  const revealUrl = `/g/${slug}/reveal`;
  const onScreen = (page: Page) => page.getByRole("region", { name: "Reveal" });

  const stage = (page: Page) => page.locator(".rv-stage");

  /** The reveal screen shows exactly this pair, at this step: centre text, and its slip on the ring with the halo. */
  async function expectPair(page: Page, step: number, pair: { giver: string; receiver: string; codename: string }) {
    await expect(page.getByText(`${step} of 3`, { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(onScreen(page)).toContainText(`Si ${pair.codename} ay si…`);
    await expect(onScreen(page)).toContainText(`${pair.giver}!`);
    await expect(onScreen(page)).toContainText(`Ang monito niya: ${pair.receiver}`);
    const current = page.locator('[data-slip][aria-current="step"]');
    await expect(current).toHaveAttribute("data-slip", String(step - 1));
    await expect(current).toHaveAttribute("data-halo", "true");
    await expect(current).toContainText(pair.giver);
    await expect(current).toContainText(`→ kay ${pair.receiver}`);
    // Revealed so far: exactly the slips before and including this one.
    await expect(page.locator('[data-slip][data-face="revealed"]')).toHaveCount(step);
  }

  let order: ReturnType<typeof revealOrderOf> = [];

  await test.step("reveal: organizer only; a count before it starts", async () => {
    const { page } = organizer;
    await navigate(page, `/g/${slug}/admin`);
    await page.getByRole("link", { name: "Open the reveal screen" }).click();
    await expect(page).toHaveURL(new RegExp(`${revealUrl}$`));
    await expect(page.getByRole("heading", { name: "Handa na?" })).toBeVisible();
    await expect(page.getByText(/^3 slips, 3 sikreto\./).filter({ visible: true })).toBeVisible();
    await shot(page, "reveal-ready");

    // A member (and a stranger) only sees "for the organizer", with no names.
    const truth = await getTruth(slug);
    const memberView = await capturePage(joyM.page, revealUrl);
    await expect(joyM.page.getByText("Para sa organizer lang ang page na 'to.")).toBeVisible();
    expectJoinPageClean(memberView, truth);
    const stranger = await newPerson("Stranger");
    expectJoinPageClean(await capturePage(stranger.page, revealUrl), truth);
    await stranger.context.close();
    // Before the start, the ready screen itself shows no pairs or codenames either.
    expectJoinPageClean(await capturePage(page, revealUrl), truth);
    expectRevealPageClean(await capturePage(page, revealUrl), truth, revealOrderOf(truth, "Joy M"), 0);
    await expect(page.locator('[data-slip][data-face="blank"]')).toHaveCount(3);
  });

  await test.step("start the reveal: first pair, redraw and remove are locked", async () => {
    const { page } = organizer;
    await page.getByRole("button", { name: "Simulan ang reveal" }).click();
    await expect(page.getByText("hindi na puwedeng mag-redraw o magtanggal", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Oo, simulan na" }).dblclick();

    order = revealOrderOf(await getTruth(slug), "Joy M");
    await expectPair(page, 1, order[0]);
    // The start plays: codenames appear, the first slip flips.
    await expect(stage(page)).toHaveAttribute("data-last-transition", "start");
    await expect(page.getByRole("button", { name: "Previous", exact: true })).toBeDisabled();
    await shot(page, "reveal-step-1");

    await navigate(page, `/g/${slug}/admin`);
    await expect(page.getByText("Nagre-reveal na")).toBeVisible();
    await expect(page.getByRole("button", { name: "Redraw" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(0);
    await expectCardOrder(page, ["Party reveal", "Names drawn", "Members"]);
    await shot(page, "admin-revealing");
  });

  await test.step("leak test during the reveal: only the pairs revealed so far, only on the reveal screen", async () => {
    const truth = await getTruth(slug);
    expectRevealPageClean(await capturePage(organizer.page, revealUrl), truth, order, 1);
    expectOrganizerPageClean(await capturePage(organizer.page, `/g/${slug}/admin`), truth);
    const stranger = await newPerson("Stranger");
    expectJoinPageClean(await capturePage(stranger.page, shareUrl), truth);
    await stranger.context.close();
    // With 3 people, the one name a member doesn't see is their giver.
    for (const { label, person } of stillIn) {
      expectMemberPageClean(await capturePage(person.page, `/g/${slug}/me`), truth, label);
    }
  });

  /**
   * Counts the reveal screen's auto-refreshes (RSC fetches that aren't
   * prefetches or Server Action posts) while `during` runs.
   */
  async function countRefreshes(page: Page, during: () => Promise<void>): Promise<number> {
    let n = 0;
    const onRequest = (r: Request) => {
      const h = r.headers();
      if (r.method() === "GET" && h["rsc"] === "1" && !h["next-router-prefetch"]) n += 1;
    };
    page.on("request", onRequest);
    try {
      await during();
    } finally {
      page.off("request", onRequest);
    }
    return n;
  }

  /** Pretends the tab is hidden (or shown again), like switching tabs. */
  async function setTabVisible(page: Page, visible: boolean) {
    await page.evaluate((visible) => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (visible ? "visible" : "hidden") });
      document.dispatchEvent(new Event("visibilitychange"));
    }, visible);
  }

  let laptop: Person;

  await test.step("Next / Previous; refreshing and another device resume at the same pair", async () => {
    const { page } = organizer;
    await navigate(page, revealUrl);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expectPair(page, 2, order[1]);
    await navigate(page);
    await expectPair(page, 2, order[1]);
    expectRevealPageClean(await capturePage(page, revealUrl), await getTruth(slug), order, 2);
    await page.getByRole("button", { name: "Previous", exact: true }).click();
    await expectPair(page, 1, order[0]);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expectPair(page, 2, order[1]);

    // The organizer link on a laptop (projector) opens at the same pair.
    laptop = await newPerson("Organizer laptop");
    await navigate(laptop.page, organizerUrl);
    await navigate(laptop.page, revealUrl);
    await expectPair(laptop.page, 2, order[1]);
  });

  await test.step("phone as remote: the laptop follows Next and Previous taps, without reloading", async () => {
    const { page } = organizer;
    // A marker that a full page load would wipe.
    await laptop.page.evaluate(() => ((window as unknown as { stayed: boolean }).stayed = true));

    // Phone taps Next → the laptop follows within a refresh or two, and
    // plays the step (flip and bulbs) instead of jumping to it.
    const before = Number(await stage(laptop.page).getAttribute("data-transitions"));
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expectPair(page, 3, order[2]);
    await expect(laptop.page.getByText("3 of 3", { exact: true }).filter({ visible: true })).toBeVisible({ timeout: 6_000 });
    await expectPair(laptop.page, 3, order[2]);
    await expect(stage(laptop.page)).toHaveAttribute("data-last-transition", "next");
    expect(Number(await stage(laptop.page).getAttribute("data-transitions"))).toBe(before + 1);
    await shot(laptop.page, "reveal-step-3-laptop-follows");

    // Arrow keys on the laptop move it; the phone follows too.
    await laptop.page.keyboard.press("ArrowLeft");
    await expectPair(laptop.page, 2, order[1]);
    await expect(stage(laptop.page)).toHaveAttribute("data-last-transition", "previous");
    await expect(page.getByText("2 of 3", { exact: true }).filter({ visible: true })).toBeVisible({ timeout: 6_000 });
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(laptop.page.getByText("3 of 3", { exact: true }).filter({ visible: true })).toBeVisible({ timeout: 6_000 });
    expect(await laptop.page.evaluate(() => (window as unknown as { stayed?: boolean }).stayed)).toBe(true);
    expectRevealPageClean(await capturePage(laptop.page, revealUrl), await getTruth(slug), order, 3);
  });

  await test.step("auto-refresh: every ~2s only while visible, never on the organizer page", async () => {
    // Visible: about one refresh every 2 seconds.
    const visible = await countRefreshes(laptop.page, () => laptop.page.waitForTimeout(5_000));
    expect(visible, "refreshes in 5s while visible").toBeGreaterThanOrEqual(1);
    expect(visible, "refreshes in 5s while visible").toBeLessThanOrEqual(4);

    // Hidden tab: none. Shown again: catches up right away.
    await setTabVisible(laptop.page, false);
    await laptop.page.waitForTimeout(500);
    expect(await countRefreshes(laptop.page, () => laptop.page.waitForTimeout(5_000)), "refreshes while hidden").toBe(0);
    const shown = await countRefreshes(laptop.page, async () => {
      await setTabVisible(laptop.page, true);
      await laptop.page.waitForTimeout(800);
    });
    expect(shown, "refresh right after the tab is shown").toBeGreaterThanOrEqual(1);

    // Only the reveal screen polls.
    const { page } = organizer;
    await navigate(page, `/g/${slug}/admin`);
    await page.waitForLoadState("networkidle");
    expect(await countRefreshes(page, () => page.waitForTimeout(5_000)), "refreshes on the organizer page").toBe(0);
    await navigate(page, revealUrl);
    await expectPair(page, 3, order[2]);
  });

  await test.step("finish: \"Ilawan ang parol\", REVEALED, all pairs on the reveal screen", async () => {
    const { page } = organizer;
    await page.getByRole("button", { name: "Ilawan ang parol" }).click();
    await expect(page.getByRole("heading", { name: "Maligayang Pasko!" })).toBeVisible();
    await expect(stage(page)).toHaveAttribute("data-last-transition", "finale");
    await expect(page.locator('[data-slip][data-halo="true"]')).toHaveCount(3);
    await expect(page.locator('[data-bulb][data-state="glow"]')).toHaveCount(await page.locator("[data-bulb]").count());
    // A phone held upright already lists every pair (the follow-along view);
    // on a landscape screen, "Lahat ng pairs" swaps the ring for the list.
    const { width, height } = page.viewportSize()!;
    if (width > height) await page.getByRole("button", { name: "Lahat ng pairs" }).click();
    const all = page.getByRole("list", { name: "All pairs" });
    await expect(all.getByRole("listitem")).toHaveCount(3);
    for (const [i, pair] of order.entries()) {
      await expect(all.getByRole("listitem").nth(i)).toHaveText(new RegExp(`^${pair.giver}\\s*→ kay ${pair.receiver}$`));
    }
    await shot(page, "reveal-done");

    // The laptop follows to the end, then stops refreshing.
    await expect(laptop.page.getByRole("heading", { name: "Maligayang Pasko!" })).toBeVisible({ timeout: 6_000 });
    await expect(stage(laptop.page)).toHaveAttribute("data-last-transition", "finale");
    await laptop.page.waitForTimeout(500);
    expect(await countRefreshes(laptop.page, () => laptop.page.waitForTimeout(5_000)), "refreshes after the end").toBe(0);
    await laptop.context.close();

    await navigate(page, `/g/${slug}/admin`);
    await expect(page.getByText("Reveal na!")).toBeVisible();
    await expect(page.getByRole("link", { name: "See all pairs" })).toHaveAttribute("href", revealUrl);
  });

  await test.step("after the reveal: each /me shows who gave to them, and nothing more", async () => {
    const truth = await getTruth(slug);
    for (const { label, person } of stillIn) {
      const giver = order.find((p) => p.receiver === label)!;
      const text = await capturePage(person.page, `/g/${slug}/me`);
      // The giver on the slip in the sky panel, then "Si {codename} pala si {name}!".
      const slip = person.page.getByRole("region", { name: "Ang nagbigay sa'yo" });
      await expect(slip).toContainText("Ang nagbigay sa'yo ay…");
      await expect(slip).toContainText(giver.giver);
      await expect(person.page.getByText(`Si ${giver.codename} pala si ${giver.giver}!`)).toBeVisible();
      if (label === "Ben") await shot(person.page, "ben-me-revealed");
      expectMemberPageClean(text, truth, label, { revealed: true });
    }
  });

  await test.step("no console errors on any page", async () => {
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
